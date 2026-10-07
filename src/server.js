const app = require('./app'); //importing the app.js file which contains the express app
const {config} = require('./config/env'); //importing the env.js file which contains the environment variables

const PORT = config.server.port || 3000; //setting the port to listen on, either from environment variable or default to 3000

const server = app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`); //log the port number to the console when the server starts
})
