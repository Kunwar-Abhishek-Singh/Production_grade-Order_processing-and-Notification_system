
const Order = require("../models/order.model");
const { notificationQueue } = require("../queues/notification.queue");

const createOrder = async (orderData) => {
  // 1. Persist the order first.
  const order = await Order.create(orderData);

  // 2. Enqueue a notification job using the saved order ID.
  await notificationQueue.add(
    "order-created",
    {
      orderId: order._id.toString()
    },
    {
      jobId: `order-created-${order._id}`
    }
  );

  return order;
};

const getOrderById = async (orderId) => {
  return Order.findById(orderId);
};

module.exports = {
  createOrder,
  getOrderById
};
