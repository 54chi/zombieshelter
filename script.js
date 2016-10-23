'use strict';

const _ = require('lodash');
const moment = require('moment-timezone');
const Script = require('smooch-bot').Script;
const scriptRules = require('./script.json');
const firebase = require("firebase");


firebase.initializeApp({
  serviceAccount: "./sheltersafe.json",
  databaseURL: "https://sheltersafe-acc35.firebaseio.com"
});


// Twilio Credentials 
const accountSid = 'ACe7d7eddddd90df5788c50eacd094f85a'; 
const authToken = '475c86d52ae7714f8b29db9edf73f58b'; 
const twilioPhone ='+13142070469';
 
//require the Twilio module and create a REST client 
var twilioClient = require('twilio')(accountSid, authToken); 

const fs=require('fs')
    ,jsonPath='citymappersample.json'
    ,request = require('request')
    ,citymock=false
    ,geoCodePathPre="http://maps.googleapis.com/maps/api/geocode/json?address="
    ,geoCodePathPost="&components=country:MX&sensor=false"
    ,urlPathPre="https://citymapper.com/api/7/journeys?";

let fromAddress
  ,toAddress
  ,clientName
  ,clientBirthday
  ,clientPhone
  ,clientID;
  
moment.tz.setDefault("America/Chicago");

/* CONSIDER MOVING THIS TO A SEPARATE FILE */

//simple helper to read a file asynchronously and return a JSON object
var readJson = function(jsonPath,callback){
    console.log("JSON PATH IS: " + jsonPath);
  fs.readFile(jsonPath,'utf8',function(err,data){
    if (err) {
      throw err
    }
    try {
      callback(JSON.parse(data));
    } catch (e) {
      console.log(e);
    }
  })
}

//simple helper to read a URL Asynchronously and return a JSON object
var loadJson = function(urlPath,callback){
  console.log("PATH IS: " + urlPath);
  request(urlPath, (error, response, data)=> {
    if (!error && response.statusCode === 200) {
      callback(JSON.parse(data));
    } else {
      console.log("Got an error: ", error, ", status code: ", response.statusCode)
    }
  })
}

//function to format the routing info object (used as the callback)
var parseResults = function(data){
  var returnMsg="I'm afraid I couldn't find any routes.";
  if(data.sections[0]) {
      var section0=data.sections[0];  //0 is the suggested routes...there could be other options, like "BUS ONLY" or "RAIN SAFE" for example
      var section0journeys=section0.journeys.length;
      var section0name=section0.name;
      var returnMsg="";
    
      if (section0journeys>0){
        returnMsg ="Here are the first three options I've found:\n";
    
        for (var optionNum=1; optionNum<4; optionNum++){
          var journey = data.journeys[optionNum-1];
          if(optionNum==1){
            returnMsg+="From: " +  journey.start.address;
            returnMsg+=" to: " +  journey.end.address+"\n";
          }
          
          //3440
          var tripDuration=journey.duration_seconds*1000;
          returnMsg+="OPTION "+ optionNum+" ("+moment.duration(tripDuration).minutes()+" minutes):\n";
    
          for (var legNum=0; legNum<journey.legs.length; legNum++){
            var leg=journey.legs[legNum];
            
            var legArrival=leg.arrival_time;
            var legDeparture=leg.departure_time;
            
            var legDuration=moment.utc(moment(legArrival).diff(moment(legDeparture))).minutes();

            console.log("TRANSIT MODE: "+ leg.mode+ "("+legDuration+")");
            
            var transitMode=(leg.mode=="transit"?"take "+ leg.routes[0].brand_id + "/"+leg.routes[0].display_name:leg.mode);
            
            var legDestination="";
            if (transitMode=="walk") {
                legDestination=" to \""+((legNum<journey.legs.length-1)?journey.legs[legNum+1].stops[0].name:journey.end.address)+"\""
                if (legDuration>10){
                    legDestination+="%[Request an Uber](postback:uber) ";
                    legDestination+="%[Find an Ecobike](postback:ecobike) "
                }
            }else{
                legDestination=" from \""+ leg.stops[0].name + "\" to \""+ leg.stops[leg.stops.length-1].name +"\""
            }
            returnMsg+= moment(legDeparture).format('LT') + ": " + transitMode + legDestination +", arriving at "+ moment(legArrival).format('LT')+"\n";
          }
          
        }
      }
      
      returnMsg+="%[Start Over](postback:getDirections)"
    }
  return returnMsg;
}

var geoResults = function(data){
    console.log("GEORESULTS: "+data.results[0].geometry.location.lat+"%2C"+data.results[0].geometry.location.lng);
  return data.results[0].geometry.location.lat+"%2C"+data.results[0].geometry.location.lng;
}

/* END OF GEO FUNCTIONS */


//FIREBASE STUFF (consider moving somewhere else for housekeeping)
var db = firebase.database();
var listings = db.ref("/listings"); //house listings
var clients= db.ref("/clients"); //clients listings
//var bookings= db.ref("/bookings"); //bookings
//var owners= db.ref("/owners"); //owners








module.exports = new Script({
    start: {
        receive: (bot) => {
            return bot.say(scriptRules["HELLO"])
                        .then(() => 'speak');
        }
    },

    speak: {
        //use the options as defined in script.json
        receive: (bot,message) => {
            let upperText = message.text.toUpperCase();  //this is where wit.ai will hook up (so it can use NLP to select the right message and parse the payloads)
            
            toAddress   = "";
            fromAddress = "";
            console.log("**** Uppertext: "+upperText);
            
            function updateSilent(){
                switch (upperText){
                    case "RECONNECT":
                    case "CONNECT ME":
                        return bot.setProp("silent",false);
                    case "QUIT":
                    case "SHUT UP":
                    case "DISCONNECT":
                        return bot.say(scriptRules["DISCONNECT"])
                            .then(bot.setProp("silent",true));
                    default:
                        return Promise.resolve();
                }
            }
            
            function getSilent(){
                return bot.getProp("silent");
            }
            
            function processMessage(isSilent){
                if (isSilent){
                    return Promise.resolve("speak");
                }
                
                if (!_.has(scriptRules, upperText)){
                    return bot.say(`I didn't understand that.`).then(() => 'speak');    //use wit.ai to suggest options
                }
                var response = scriptRules[upperText];
                var lines = response.split('\n');

                var p = Promise.resolve();
                _.each(lines, function(line) {
                    line = line.trim();
                    p = p.then(function() {
                        console.log(line);
                        return bot.say(line);
                    });
                })

                return p.then(() => 'speak');
            }
            
            
            if (upperText=="GET DIRECTIONS"){
                return bot.say(scriptRules["GET DIRECTIONS"])
                    .then(() => 'getDirections');
            }else if (upperText=="FIND A HOME"){
                return bot.say(scriptRules["FIND A HOME"])
                    .then(() => 'findShelter');
            }else if (upperText=="REQUEST APPOINTMENT"){
                return bot.say(scriptRules["APPOINTMENT"])
                    .then(() => 'appointment');    
            }else{
                return updateSilent()
                    .then(getSilent)
                    .then(processMessage);
            }

        }
    },
    
    getDirections: {
        prompt: (bot) => bot.say('From where? You can say something like: \'Av. Vasco De Quiroga #2000, Alvaro Obregon, DF\''),
        receive: (bot, message) => {
            fromAddress = message.text;
            return bot.setProp('fromAddress', fromAddress)
//                .then(() => bot.say(`${fromAddress}?`))
//                .then(() => bot.say(`Sure, we'll use this as your starting point`))
                .then(() => 'toDirections');
        }
    },


    findShelter:{
        prompt: (bot) => bot.say('What\'s your first and last name please?'),
        receive: (bot, message) => {
            clientName = message.text;
            return bot.setProp('clientName', clientName)
                .then(() => 'getClientBirthday');
        }
        
    },
    
    getClientBirthday:{
        prompt: (bot) => bot.say('Thank you. And what\'s your date of birth?'),
        receive: (bot, message) => {
            clientBirthday = message.text;
            return bot.setProp('clientBirthday', clientBirthday)
                .then(() => 'getClientID');
        }
        
    },
    
    
    
    
    
    getClientID:{
        prompt: (bot) => bot.say('Finally, what\'s your Program ID?'),
        receive: (bot, message) => {
            var optionNum=0;
            function processMessage(response){
                var lines = response.split('\n');

                var p = Promise.resolve();
                _.each(lines, function(line) {
                    line = line.trim();
                    p = p.then(function() {
                        console.log(line);
                        return bot.say(line);
                    });
                })
                return p.then(() => 'speak');
            }
//                    listings.on("child_added", function(snapshot, prevChildKey) {

            var returnMsg="Sorry. I couldn't find any housing that matches your criteria. Please consider a broader one.";
            clientID = message.text;
            return bot.setProp('clientID', clientID)
                .then(()=>{
                    clients.orderByChild("programID").equalTo(clientID).on("child_added", function(snapshot) {
                        var clientFound=snapshot.val();
                        clientPhone=clientFound.phone;
                        var preferences=clientFound.preferences;
                        console.log("preferences:" + preferences.neighborhood);
                    
//                        console.log("WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW");
                   
//                        listingsFiltered=(preferences.neighborhood === "undefined")?listings:listings.orderByChild("neighborhood").equalTo(preferences.neighborhood);
//                        listingsFiltered=(prefSchool !== "undefined")?listingsFiltered.orderByChild("schoolDistrict").equalTo(prefSchool):listingsFiltered;
                   
                   
                   
                    
                        listings.orderByChild("neighborhood").equalTo(preferences.neighborhood).on("child_added", function(snapshot) {
                            if (optionNum==0){
                                returnMsg="Here is the list of available housing that I found:";
                            }
                            optionNum++;
                            
                            var listFound = snapshot.val();
                            returnMsg+="OPTION "+ optionNum+" (98% match): \n";
                            returnMsg+=listFound.name+" ("+ listFound.neighborhood+ ") \n";
                            returnMsg+="Description: " + listFound.description+"\n";
                            returnMsg+="Address: " + listFound.address+"\n";
                            returnMsg+="School District: " + listFound.schoolDistrict+"\n";
                            returnMsg+="%[Request Appointment](postback:appointment22) \n";
    //                        returnMsg+="%[Start Over](postback:findShelter)\n";
                            console.log("33333");
                        })
                    
    //            }).then(()=>{
                    console.log("44444");
                    processMessage(returnMsg)
                })
                })
        }    
    },
    
    appointment:{
        receive: (bot,message) => {
            return twilioClient.messages.create({ 
                    to: '+13123207706', 
                    from: twilioPhone, 
                    body: "Thank you. One of our agents will contact you soon at this number for details",  
                }, function(err, tmessage) { 
                    if (err) {
                        console.log(err);
                    }
                    console.log(tmessage.sid); 
                })
                .then(() => 'finish');
        }
        
    },
    

    toDirections: {
        prompt: (bot) => bot.say('To where? E.g.: \'Av San Antonio 461, Álvaro Obregón\''),
        receive: (bot, message) => {
            toAddress = message.text;
            var results;
            
            function processMessage(response){
                var lines = response.split('\n');

                var p = Promise.resolve();
                _.each(lines, function(line) {
                    line = line.trim();
                    p = p.then(function() {
                        //console.log(line);
                        return bot.say(line);
                    });
                })

                return p.then(() => 'speak');
            }
            
            
            return bot.setProp('toAddress', toAddress)
                .then(() => {
                    bot.say(`So, from ${fromAddress} to ${toAddress}, huh?`)
                    .then(() => bot.say(`Give me a few seconds while I find you some routes ;)`)
                        .then(() => {
                            var sAddress=encodeURIComponent(fromAddress);
                            var eAddress=encodeURIComponent(toAddress);
    
                            //Get the coordinates for the entered address
                            loadJson(geoCodePathPre+sAddress+geoCodePathPost,function(data){
                              const sCoord=geoResults(data);
                              loadJson(geoCodePathPre+eAddress+geoCodePathPost,function(data){
                                  const eCoord=geoResults(data);
                                  const urlPath=urlPathPre+"start="+sCoord+"&end="+eCoord+"&saddr="+sAddress+"&eaddr="+eAddress+"&region_id=mx-df"
                                  console.log("API URL PATH:" +urlPath);
                            
                                  //get the routes
                                  if (citymock) {
                                    console.log(" *** (MOCKING MODE) \n");
                                    readJson(jsonPath,function(data){
                                        results= parseResults(data);
                                        console.log("RESULTS "+ results);
                                        processMessage(results)

                                    });
                                  }else{
                                    console.log(" *** (LIVE MODE) \n");
                                    loadJson(urlPath,function(data){
                                        results= parseResults(data);
                                        console.log("RESULTS "+ results);
                                        processMessage(results)
                                    });
                                  }
                              })
                            })
                        })
                            
                    )
                    
                })

        }
    },

    bye: {
      prompt: (bot) => bot.say('Ok. Hope it helps!'),
      receive: () => 'speak'
    },
    
    finish: {
        receive: (bot, message) => {
            return bot.getProp('name')
                .then((name) => bot.say(`Sorry ${name}, my creator didn't ` +
                        'teach me how to do anything else!'))
                .then(() => 'finish');
        }
    }
});
