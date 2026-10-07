require("dotenv").config(); // Load environment variables from .env file

const config = {
    port: process.env.PORT || 3000, // Set the port from environment variable or default to 3000
    nodeEnv: process.env.NODE_ENV || 'development' // Set the node environment from environment variable or default to 'development'
}

module.exports = config; // Export the config object to be used in other files