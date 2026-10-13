const express = require('express');

const healthRoutes = require('./health.routes'); //importing the health routes which contains the health check endpoint
const orderRoutes = require('./order.routes'); //importing the order routes which contains the order creation endpoint
const adminRoutes = require('./admin.routes');
const router = express.Router(); //creating a new router object to handle routes

router.use("/health", healthRoutes); //using the health routes for handling the health check endpoint
router.use("/orders", orderRoutes); //using the order routes for handling the order creation endpoint
router.use("/admin", adminRoutes);
module.exports = router; //exporting the router object to be used in other files