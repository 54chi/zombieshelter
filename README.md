# ZombieShelter chatbot

What is it? A multi messenger chatbot to help homeless people and their agencies find permanent housing.

What "multi messenger" means is that with our approach you are not tied to only one type of messenger app or website (e.g. facebook), but you can also have the same services through any other major messenger/web out there (instagram, line, whatsapp, twitter, etc.) or even within your website. Even better: you can start in one app, and continue in another. ShelterShare will remember and go with you.

### Supported platforms:

- Web/web mobile
- Facebook Messenger
- Twilio

### Supported commands:

- Hello
- Bot Info
- Technical Details
- Coming Next
- Help
- FIND A HOME
- Get Directions
- Bye
- I love you
- Thanks
- Disconnect
- Connect Me

__IMPORTANT__: The bot records all interaction to it for analytics and future improvement.

# TECH STACK

It's a good thing that all can be done in one language. I hate promises though.

1. NodeJS
1. Firebase
1. Smooch
1. Facebook Messenger
1. Twilio
1. Wit.ai

# INSTALL

Built on [smooch/smooch-bot](https://github.com/smooch/smooch-bot).

To install it. from this directory you should:

```
$ npm install
```

Core logic is defined in `script.js`. Feel free to play around with it as you go.

## Heroku Example (/heroku)

This is an Express app that uses the Smooch web widget to provide the chat interface. The app makes use of `SmoochApiStore` and `SmoochApiBot` to persist conversation state and user properties via Smooch.

To deploy your own:

1. First, sign up for a free account at [smooch.io](https://app.smooch.io/signup)

1. With a new Smooch app created, go to the settings tab and take note of your App Token. Also, generate a new Secret Key, and take note of the key ID and secret.

1. Deploy your app to Heroku using the button below. You'll need to specify your app token, key ID, and secret in the app's `SMOOCH_APP_TOKEN`, `SMOOCH_KEY_ID`, and `SMOOCH_SECRET` config settings.

    [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/smooch/smooch-bot-example)

1. Your app should now be running on Heroku but you're not quite done yet. Take note of the URL where your heroku app is running, for example `https://foo-bar-4242.herokuapp.com`. You'll need to specify this in your heroku app `SERVICE_URL` config variable. You can do this in the Heroku control panel under *Settings* > *Config Variables*, or if you have the [Heroku Toolbelt](https://toolbelt.heroku.com/) installed you can do it like so:

        $ heroku config:set SERVICE_URL=https://foo-bar-4242.herokuapp.com -a foo-bar-4242

1. You should be all set. Open your Heroku app and start chatting with your new bot!

1. **Bonus:** Open the Smooch [control panel](https://app.smooch.io) and add more integrations. You can add new user channels like Twilio SMS, or you can add Slack or HipChat which will let you join in on the conversation along side your bot. Pretty neat!


# Troubleshooting your bot

Is your bot misbehaving? Not working? Here are some steps you can follow to figure out what's going wrong.

## Check your bot's logs on heroku

If there's a bug in your code, checking the heroku logs is the best way to figure out what's going wrong. Here's how:

1. Install the heroku toolbelt: https://toolbelt.heroku.com/ These are power tools that let you do a lot more than what Heroku dashboard alone allows.

2. Next, open your preferred terminal app. On OSX the default Terminal app will work fine here.

3. Log in to the heroku toolbelt with the following command:

        heroku login

    If the command heroku isn't found, try restarting your terminal app. Once logged in you should be able to list all of your heroku apps like so:

        heroku apps

    which should give you something like this:

        $ heroku apps
        === My Apps
        your-app

4. Now you can check the logs of your heroku app like so:

        heroku logs -a your-app

## How do I deploy my fixes to Heroku?

1. To deploy using git you first have to download a copy of your heroku app's code, like so:

        git clone https://github.com/your-github-username/your-app

    Note that git will prompt you to enter your github credentials.

2. This will create a new git copy of your code in a new folder. You can go into that folder like so:

        cd your-app

3. Now you can use the heroku toolbelt to link this git copy up to your heroku app with the following command:

        heroku git:remote -a your-app

4. Once that's done, you can now deploy to heroku directly from this directory. If you've made any fixes on github directly, be sure to sync them here like so:

        git pull origin master
        git push heroku master

5. You can also make changes to your local copy of the code. To do this, edit whatever file you wish in your preferred text editor, and then commit and push them up to github. You'll add a commit message, which is a short sentence decribing what you changed.

        git commit -a -m 'Your commit message'
        git push origin master

    Then, you can deploy those changes to heroku in the same way:

        git push heroku master
