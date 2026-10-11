const mongoose = require('mongoose'); //importing mongoose to connect to the database
const config = require('./env'); //importing the config file which contains the database configuration

const connectDB = async () => {
    if(!config.config.database.mongodbUri){
        throw new Error("MONGODB_URI is not configured");
    }


    await mongoose.connect(config.config.database.mongodbUri);


    console.log("MongoDB connected successfully");

};

module.exports = connectDB; //exporting the connectDB function to be used in other files