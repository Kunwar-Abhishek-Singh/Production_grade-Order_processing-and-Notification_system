const { getHealthStatus } = require('../services/health.service'); //importing the health service which contains the logic for the health check endpoint

const getHealth = (req, res) => {

    const health = getHealthStatus(); //calling the health service to get the health status of the server
    
    res.status(200).json(health); //sending the health status as a response to the client
};

module.exports = {
    getHealth
};