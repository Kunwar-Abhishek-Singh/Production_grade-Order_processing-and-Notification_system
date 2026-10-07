const express = require('express');

const router = express.Router(); //creating a new router object to handle routes

router.get("/health", (req, res) => { // our health check endpoint, to check if the server is Healthy or not
    res.status(200).json({
        status:"OK",
        message:"Server is Healthy"
    });
});

module.exports = router;