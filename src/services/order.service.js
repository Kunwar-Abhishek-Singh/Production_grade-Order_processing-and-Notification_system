const Order = require('../models/order.model'); //importing the Order model which is used to interact with the orders collection in the database

const createOrder = async (orderData) => {
    const order = await Order.create(orderData); //creating a new order in the database using the Order model
    return order; //returning the created order
};

module.exports = {
    createOrder //exporting the createOrder function to be used in other files
};