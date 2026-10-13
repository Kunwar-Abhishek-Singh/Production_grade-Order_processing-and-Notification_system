const express = require('express');
const path = require("path");

const routes = require('./routes'); //importing the routes which contains all the endpoints of the application
const errorHandler = require('./middleware/error.middleware'); //importing the error handler middleware which handles all the errors in the application
const app = express(); //for handling middlewares and routes and error handlers

app.set('view engine', 'ejs'); //setting the view engine to ejs for rendering the views
app.set('views', __dirname + '/views'); //setting the views directory to the views folder in the root directory

app.use(express.json()); // when a request contains JSON data, this parse it and make it available through req.body

app.use(express.urlencoded({extended: true})); // when a request contains URL encoded data, this parse it and make it available through req.body

app.use(express.static(path.join(__dirname, 'public'))); // serving static files from the public directory));

// app.get("/health", (req, res) => { // our health check endpoint, to check if the server is Healthy or not
//     res.status(200).json({
//         status:"OK",
//         message:"Server is Healthy"
//     });
// });

app.use(routes); //using the routes for handling all the endpoints of the application

app.use(errorHandler); //using the error handler middleware for handling all the errors in the application

module.exports = app;
