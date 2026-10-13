
const orderService = require("../services/order.service");
const AppError = require("../utils/AppError");

const getOrderDetailsPage = async (req, res, next) => {
  const order = await orderService.getOrderById(req.params.id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const viewData = {
    title: "Order Details",
    order
  };

  // Render the order details page first.
  res.render("pages/order-details", viewData, (err, pageHtml) => {
    if (err) return next(err);

    // Insert the page into the shared layout.
    res.render(
      "layouts/main",
      { ...viewData, body: pageHtml },
      (layoutError, html) => {
        if (layoutError) return next(layoutError);
        res.send(html);
      }
    );
  });
};

module.exports = { getOrderDetailsPage };
