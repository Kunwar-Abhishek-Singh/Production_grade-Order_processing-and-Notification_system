require("dotenv").config(); // Load environment variables from .env file

const requiredEnvVariables = ["MONGODB_URI", "REDIS_URL", "JWT_SECRET"] // List of required environment variables

// Check if all required environment variables are set
const validateEnvironment = () => {
    const missingVariables =  requiredEnvVariables.filter((variable) => !process.env[variable]);

    if(missingVariables.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVariables.join(", ")}`); // Throw an error if any required environment variable is missing
    }
};

// const config = {
//     port: process.env.PORT || 3000, // Set the port from environment variable or default to 3000
//     nodeEnv: process.env.NODE_ENV || 'development', // Set the node environment from environment variable or default to 'development'
//     mongodbUri: process.env.MONGODB_URI, // Set the MongoDB URI from environment variable
//     redisUrl: process.env.REDIS_URL, // Set the Redis URL from environment variable
//     jwtSecret: process.env.JWT_SECRET // Set the JWT secret from environment variable
// }

const config = {
    server:{
        port: process.env.PORT || 3000, // Set the port from environment variable or default to 3000
        nodeEnv: process.env.NODE_ENV || 'development', // Set the node environment from environment variable or default to 'development'
    },

    database:{
        mongodbUri: process.env.MONGODB_URI, // Set the MongoDB URI from environment variable
    },

    redis:{
        redisUrl: process.env.REDIS_URL, // Set the Redis URL from environment variable
    },

    auth:{
        jwtSecret: process.env.JWT_SECRET // Set the JWT secret from environment variable
    }
}

module.exports = {config, validateEnvironment}; // Export the config object to be used in other files