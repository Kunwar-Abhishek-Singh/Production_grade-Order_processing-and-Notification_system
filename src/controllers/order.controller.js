const {sendSuccess} = require('../utils/apiResponse'); //importing the sendSuccess utility which sends a success response to the client

const createOrder = (req, res) => {
    const orderData = req.validated.body;
    // res.status(201).json({
    //     status: "Success",
    //     message: "Request validation passed",
    //     data: orderData
    // });

    return sendSuccess(res, {
        statusCode: 201,
        message: 'Request validation passed',
        data: orderData
    });
};

module.exports = {createOrder};