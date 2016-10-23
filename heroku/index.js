'use strict';

const smoochBot = require('smooch-bot');
const MemoryLock = smoochBot.MemoryLock;
const SmoochApiStore = smoochBot.SmoochApiStore;
const SmoochApiBot = smoochBot.SmoochApiBot;
const StateMachine = smoochBot.StateMachine;
const app = require('../app');
const script = require('../script');
const SmoochCore = require('smooch-core');
const jwt = require('../jwt');
const scriptRules = require('../script.json');

const name = 'ShelterShare';
const avatarUrl ='https://media.smooch.io/580b3588182e55330010edaa/icons/web_button_icon.jpg';
const store = new SmoochApiStore({
    jwt
});

const lock = new MemoryLock();
const webhookTriggers = ['message:appUser', 'postback'];
var postbackAction="";

function createWebhook(smoochCore, target) {
    return smoochCore.webhooks.create({
        target,
        triggers: webhookTriggers
    })
    .then((res) => {
        console.log('Smooch webhook created with target', res.webhook.target);
    })
    .catch((err) => {
        console.error('Error creating Smooch webhook:', err);
        console.error(err.stack);
    });
}

function updateWebhook(smoochCore, existingWebhook) {
    return smoochCore.webhooks.update(existingWebhook._id, {
        triggers: webhookTriggers
    })
        .then((res) => {
            console.log('Smooch webhook updated with missing triggers', res.webhook.target);
        })
        .catch((err) => {
            console.error('Error updating Smooch webhook:', err);
            console.error(err.stack);
        });
}

// Create a webhook if one doesn't already exist
if (process.env.SERVICE_URL) {
    const target = process.env.SERVICE_URL.replace(/\/$/, '') + '/webhook';
    const smoochCore = new SmoochCore({
        jwt
    });
    smoochCore.webhooks.list()
        .then((res) => {
            const existingWebhook = res.webhooks.find((w) => w.target === target);

            if (!existingWebhook) {
                return createWebhook(smoochCore, target);
            }

            const hasAllTriggers = webhookTriggers.every((t) => {
                return existingWebhook.triggers.indexOf(t) !== -1;
            });

            if (!hasAllTriggers) {
                updateWebhook(smoochCore, existingWebhook);
            }
        });
}

function createBot(appUser) {
    const userId = appUser.userId || appUser._id;
    return new SmoochApiBot({
        name,
        avatarUrl,
        lock,
        store,
        userId
    });
}

function handleMessages(req, res) {
    const messages = req.body.messages.reduce((prev, current) => {
        if (current.role === 'appUser') {
            prev.push(current);
        }
        return prev;
    }, []);

    if (messages.length === 0) {
        return res.end();
    }

    const stateMachine = new StateMachine({
        script,
        bot: createBot(req.body.appUser)
    });

    const msg=messages[0];
    console.log("    Last action selected:"+postbackAction);
    console.log("    Message:"+msg.text);

    stateMachine.receiveMessage(msg)
        .then(() => res.end())
        .catch((err) => {
            console.error('SmoochBot error:', err);
            console.error(err.stack);
            res.end();
        });
}

function handlePostback(req, res) {
    var msg = req.body.postbacks[0];
        msg.text = msg.action.text;
    
    const stateMachine = new StateMachine({
        script,
        bot: createBot(req.body.appUser)
    });
    
    const postback = req.body.postbacks[0];
    if (!postback || !postback.action) {
        res.end();
    }

    const smoochPayload = postback.action.payload.trim().toUpperCase();
    postbackAction=smoochPayload;
    
    console.log("    Postback payload action:"+smoochPayload);


    stateMachine.receiveMessage(msg)
        .then(() => res.end())
        .catch((err) => {
            console.error('SmoochBot error:', err);
            console.error(err.stack);
            res.end();
        });

}

app.post('/webhook', function(req, res, next) {
    const trigger = req.body.trigger;

    switch (trigger) {
        case 'message:appUser':
            console.log("HANDLING MESSAGE...");
            handleMessages(req, res);
            break;

        case 'postback':
            console.log("HANDLING POSTBACK...");
            handlePostback(req, res);
            break;

        default:
            console.log('Ignoring unknown webhook trigger:', trigger);
    }
});

var server = app.listen(process.env.PORT || 8000, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Smooch Bot listening at http://%s:%s', host, port);
});
