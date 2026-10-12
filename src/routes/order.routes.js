const express = require('express');
const validate = require('../middleware/validate.middleware'); //importing the validate middleware which validates the request body against the schema
const { createOrderSchema } = require('../validators/order.validator'); //importing the createOrderSchema which contains the validation rules for the request body
const {getOrderByIdSchema} = require('../validators/get-order.validator'); //importing the getOrderByIdSchema which contains the validation rules for the request params

const  { createOrder } = require('../controllers/order.controller'); //importing the health controller which contains the logic for the health check endpoint
const {getOrderById} = require('../controllers/get-order.controller'); //importing the health controller which contains the logic for the health check endpoint

const asyncHandler = require('../utils/asyncHandler'); //importing the asyncHandler utility which handles async errors in the application

const router = express.Router(); //creating a new router object to handle routes

//asyncHandler is a higher order function which takes a function as an argument and return a new function which handler the errors in the application, it is used to handle async errors in the application
router.post("/", validate(createOrderSchema), asyncHandler(createOrder)); // our order creation endpoint, to create a new order in the system;
router.get("/:id", validate(getOrderByIdSchema), asyncHandler(getOrderById)); // our order retrieval endpoint, to get an existing order by its ID;
module.exports = router;