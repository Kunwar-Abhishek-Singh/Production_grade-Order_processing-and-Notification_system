const {sendSuccess} = require('../utils/apiResponse'); //importing the sendSuccess utility which sends a success response to the client
const orderService =  require('../services/order.service'); //importing the createOrder service which contains the logic for creating a new order in the system

const createOrder = async (req, res) => {
    

    const order = await orderService.createOrder(req.validated.body); //creating a new order in the system using the createOrder service
    console.log("Order created:", order); //logging the created order to the console
    return sendSuccess(res, {
        statusCode: 201,
        message: 'Request validation passed',
        data: order
    });
};

module.exports = {createOrder};