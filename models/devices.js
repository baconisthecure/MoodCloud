var logger = require('../logger')
var config =  require('../config.js');
// getting-started.js
var mongoose = require('mongoose');
var Promise = require('bluebird');
logger.debug(config.get("mongoose:uri"));
Promise.promisifyAll(mongoose);



//Shouldd determine if the connection is already open or not
mongoose.connect(config.get('mongoose:uri'));



var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  logger.info("DB Connected");
});


var Schema = mongoose.Schema;




var deviceSchema = new Schema({
    name: String,
    MACAddress:String,
    deviceType: String,
    isEnabled: Boolean,
    registered_on: Date, //note that this is a string in swagger
    updated_on:Date //note that this is a string in swagger

})


//Middleware to do some work on the device prior to save
deviceSchema.pre('save',function(next){
    
    //Get the current date
    var currentDate = new Date();
    logger.debug(currentDate);

    //Since we are updating values we should keep track of this update
    //this.updated_on = currentDate;

    //If the device has never been registered this must be first time event so save registration date
    // if(!this.registered_on)
     //   this.registered_on = currentDate;  

    // logger.debug(updated_on);
    // logger.debug(registered_on);

    next();     
    
})

var Device = mongoose.model('Device',deviceSchema);

module.exports = Device;