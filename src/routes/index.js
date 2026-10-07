const express = require('express');

const healthRoutes = require('./health.routes'); //importing the health routes which contains the health check endpoint

const router = express.Router(); //creating a new router object to handle routes

router.use(healthRoutes); //using the health routes for handling the health check endpoint

module.exports = router; //exporting the router object to be used in other files