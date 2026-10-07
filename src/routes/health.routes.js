const express = require('express');
const  { getHealth } = require('../controllers/health.controller'); //importing the health controller which contains the logic for the health check endpoint

const router = express.Router(); //creating a new router object to handle routes

router.get("/health", getHealth); // our health check endpoint, to check if the server is Healthy or not;

module.exports = router;