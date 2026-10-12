const Order = require('../models/order.model'); //importing the Order model which is used to interact with the orders collection in the database

const createOrder = async (orderData) => {
    const order = await Order.create(orderData); //creating a new order in the database using the Order model
    return order; //returning the created order
};

const getOrderById = async (orderId) => {
    const order = await Order.findById(orderId); //finding an order in the database by its ID using the Order model
    return order; //returning the found order
};

module.exports = {
    createOrder,
    getOrderById //exporting both functions to be used in other files
};