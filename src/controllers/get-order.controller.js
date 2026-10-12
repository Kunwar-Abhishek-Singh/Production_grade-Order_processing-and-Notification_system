const { sendSuccess } = require("../utils/apiResponse");
const orderService = require("../services/order.service");
const AppError = require("../utils/AppError");

const getOrderById = async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Order retrieved successfully",
    data: order
  });
};

module.exports = { getOrderById };