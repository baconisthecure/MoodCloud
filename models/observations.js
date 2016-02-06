var logger = require('../logger')
var config =  require('../config.js');


var mongoose = require('mongoose');
var Promise = require('bluebird');
Promise.promisifyAll(mongoose);

var moment = require("moment");//used for date/time functions

var e = 2.718281828;
var r = -.5;

logger.debug(config.get("mongoose:uri"));
mongoose.connect(config.get('mongoose:uri'));


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  logger.info("DB Connected");
});


var Schema = mongoose.Schema;



var observationSchema = new Schema({
    type: String,
    deviceID: String,
    name: String,    
    value: Number,
    observed_at:Date //note that this is a string in swagger

})


//Middleware to do some work on the device prior to save
observationSchema.pre('save',function(next){
    
    //Get the current date
    this.observed_at = moment().format();    

    //Since we are updating values we should keep track of this update
    //this.updated_on = currentDate;

    //If the device has never been registered this must be first time event so save registration date
    // if(!this.registered_on)
     //   this.registered_on = currentDate;  

    // logger.debug(updated_on);
    // logger.debug(registered_on);

    next();     
    
})


    
observationSchema.methods.decayValue = function( )
{
        
    currentTime = moment();    
    timeObservation = moment(this.observed_at);       
    t = Math.abs(timeObservation.diff(currentTime, 'minutes'));
    
        
    //logger.debug("The current time is: %s which is %d minutes since the observed time of %s",currentTime.format(),t,timeObservation.format());
    //logger.debug("%d = %d ^ (%d* %d)  ",Math.pow(e,r*t),e,r,t);
    
    var decayedObservation = this.value * Math.pow(e,r*t);
    
    return decayedObservation;
}




var Observation = mongoose.model('Observation',observationSchema);

module.exports = Observation;