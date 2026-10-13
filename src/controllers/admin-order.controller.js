
const adminOrderService = require("../services/admin-order.service");

const getOrdersPage = async (req, res, next) => {
  const result = await adminOrderService.getOrders(req.validated.query);

  const viewData = {
    title: "Orders",
    ...result
  };

  res.render("pages/orders", viewData, (err, pageHtml) => {
    if (err) return next(err);

    res.render("layouts/main", {
      ...viewData,
      body: pageHtml
    }, (layoutError, html) => {
      if (layoutError) return next(layoutError);

      res.send(html);
    });
  });
};

module.exports = { getOrdersPage };
