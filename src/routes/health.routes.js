const express = require('express');
const  { getHealth } = require('../controllers/health.controller'); //importing the health controller which contains the logic for the health check endpoint
const asyncHandler = require('../utils/asyncHandler'); //importing the asyncHandler utility which handles async errors in the application

const router = express.Router(); //creating a new router object to handle routes
//asyncHandler is a higher order function which takes a function as an argument and return a new function which handler the errors in the application, it is used to handle async errors in the application
router.get("/health", asyncHandler(getHealth)); // our health check endpoint, to check if the server is Healthy or not;

module.exports = router;