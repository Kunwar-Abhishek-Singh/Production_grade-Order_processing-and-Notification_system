const app = require('./app'); //importing the app.js file which contains the express app
const {config} = require('./config/env'); //importing the env.js file which contains the environment variables
const connectDB = require('./config/database'); //importing the database.js file which contains the database connection logic
const { connectRedis } = require('./config/redis');


const PORT = config.server.port || 3000; //setting the port to listen on, either from environment variable or default to 3000

// const server = app.listen(PORT,() => {
//     console.log(`Server is running on port ${PORT}`); //log the port number to the console when the server starts
// })

const startServer = async () => {
    try {
        await connectRedis();
        await connectDB(); //connect to the database

        const server = app.listen(config.server.port,() => {
            console.log(`Server is running on port ${config.server.port}`);
        });

        return server; //return the server instance to be used in other files
    } catch (error) {
        console.error("Failed to start server:", error.message); //log the error message to the console if the server fails to start
        process.exitCode = 1; //set the exit code to 1 to indicate an error
    }
};

startServer(); //start the server


