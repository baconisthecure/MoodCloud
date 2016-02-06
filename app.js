'use strict';

//thrid party libraries
var SwaggerRestify = require('swagger-restify-mw')
    , path = require('path')
    , url = require('url')    
    ,mqtt    = require('mqtt')
    ,restify = require('restify')
    ,moment = require("moment");//used for date/time functions

var Device = require('./models/devices')
    ,logger = require('./logger')
    ,config = require('./config')
    ,Observation = require('./models/observations');



var app = restify.createServer();




module.exports = app; // for testing

var swaggerConfig = {
  appRoot: __dirname // required config
};

SwaggerRestify.create(swaggerConfig, function(err, swaggerRestify) {
  if (err) { throw err; }

  swaggerRestify.register(app);

  var port = process.env.PORT || 3000;
  app.listen(port);

    /*
  if (swaggerRestify.runner.swagger.paths['/hello']) {
    logger.debug((try this:\ncurl http://127.0.0.1:' + port + '/hello?name=Scott');
  }*/
});


//Log the MQTT server details once 
logger.info("URI: %s,port: %s, user: %s, password: %s",config.get("mqtt:uri"), config.get("mqtt:port"),config.get("mqtt:username"),config.get("mqtt:password"));

//Connect to the MQTT server
  var client = mqtt.connect(config.get("mqtt:uri"), {
    port:config.get("mqtt:port"),
    username:config.get("mqtt:username"),
      password:config.get("mqtt:password") 
  });




//var client  = mqtt.connect('mqtt://test.mosquitto.org');



client.on('error', function (e) {
    logger.warn("This isn't good");
    logger.warn(e);
  
});
 
client.on('connect', function () {
        logger.info("MQTT Connected");
        //channels to listen to 
        client.subscribe('presence');
        client.subscribe('device');
        client.subscribe('moodObservation');
        client.subscribe('initDevice');
        client.publish("here","foo");

});


client.on('reconnect', function () {
    logger.debug("Reconnect");
  
});

client.on('publish', function (packet) {
    logger.debug("publish");
    logger.debug(packet);
  
});

 
client.on('message', function (topic, message) {
  // message is Buffer 
    logger.debug("New message with topic \"%s\" and message: %s",topic.toString(),message.toString());  
    
    switch(topic  )
    {
            case "device":
            {
                logger.debug("Device messge");
                var newDevice = new Device(
                    {
                        name: "some Device",
                        deviceType: "emitter",
                        isEnabled: true

                    }
                )


                newDevice.save(function(err)                      
                {
                    if(err)
                    {
                        logger.warn(err);
                    }

                });
                
                break;
            }
            case "initDevice":
            {
                logger.debug("initDevice messge");
                client.publish('colorChange', 'Go get the average mood and publish it');
                break;
                
            }
            case "colorChange":
            {
                logger.debug("colorChange messge");                
                break;
                
            }
            case "moodObservation":
            {
                //{"name":"blue","deviceId":"id","value":233}
                logger.debug("moodObservation message");
                //logger.debug("the message of the observations is %s",message);
                var messageObject = JSON.parse(message);
                //logger.debug("value %s, name %s, ID %s",messageObject.value,messageObject.name,messageObject.deviceID);
           /*     var newObservation = new Observation(
                    {
                        type: "emitter",
                        deviceID: "emitter",
                        name: "blue",                                                
                        value: 255,
                        observed_at:moment().format()   
    
                    }
                );    */
                 
                
                //AOBTODO why cant' I just use the one from message
                var newObservation = new Observation();
                newObservation.type = messageObject.type;
                newObservation.deviceID = messageObject.deviceID;
                newObservation.name = messageObject.name;
                newObservation.value = messageObject.value;                
                
                
                newObservation.saveAsync()
                .spread(function(saveObservation,numAffected)
                {
                    logger.debug("saved %d objects",numAffected);
                    logger.debug("saved an %s objects with name %s and value %s",saveObservation.type,saveObservation.name,saveObservation.value);
                    
                    
                       //find all the observations for today

                      var ColorChangeObject =  {};


                    var queryPromises = [todaysObservations('red'),todaysObservations('green'),todaysObservations('blue')];

                    Promise.all(queryPromises)
                    .then(function(queryArr){
                        logger.warn(queryArr);
                        ColorChangeObject.redIntensity = queryArr[0];
                        ColorChangeObject.greenIntensity = queryArr[1];
                        ColorChangeObject.blueIntensity = queryArr[2];

                    })
                    .then(function(){
                        logger.debug(JSON.stringify(ColorChangeObject));
                        client.publish('colorChange', JSON.stringify(ColorChangeObject));
                    })
                    .catch(function(err){
                       logger.warn(new Error(err));
                    });

                })
                .catch(function(err){
                    logger.warn(new Error(err));
                    
                });
                
                break;
                
            }            
            
            default:
            {
                logger.warn("Invalid messge");                
            }
    }
  
});


var todaysObservations = function (colorName)
{
    
                
    var today = moment().startOf('day');
    var tomorrow = moment(today).add(1,'days');
    

    //blue //AOBTODO change this from a function to a query to get past callback issue (mongoosejs.com/docs/promises.html)
     var bluePromise = Observation.find({
        observed_at:{
            $gte: today.toDate(),
            $lt: tomorrow.toDate()
        },
        'name':colorName
    })
     .execAsync()
     .then(function(blueObservations)
    {    
         logger.debug("%d observations",blueObservations.length);

        if(blueObservations.length > 0)
        {
            var blueColor = 0;

            for(var i=0;i<blueObservations.length;i++)
            {
                logger.debug("Observation: %d, Decay Value: %d",blueObservations[i].value,blueObservations[i].decayValue());
                blueColor = blueColor + blueObservations[i].decayValue();                                
            }  

            blueColor = Math.round(blueColor / blueObservations.length);                            
            //logger.debug("Decayed Average weight %d",blueColor);
            return Promise.resolve(blueColor);                        
        }
         else
        {

        //Empty 
        return Promise.resolve(0);
        }


     })
     .catch(function(err){
        // logger.warn(new Error(err) );
         return Promise.reject(new Error(err));
     });      
    
    return bluePromise;
    
    
}

