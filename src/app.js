const express = require('express');
const routes = require('./routes'); //importing the routes which contains all the endpoints of the application
const errorHandler = require('./middleware/error.middleware'); //importing the error handler middleware which handles all the errors in the application
const app = express(); //for handling middlewares and routes and error handlers

app.use(express.json()); // when a request contains JSON data, this parse it and make it available through req.body

// app.get("/health", (req, res) => { // our health check endpoint, to check if the server is Healthy or not
//     res.status(200).json({
//         status:"OK",
//         message:"Server is Healthy"
//     });
// });

app.use(routes); //using the routes for handling all the endpoints of the application

app.use(errorHandler); //using the error handler middleware for handling all the errors in the application

module.exports = app;
