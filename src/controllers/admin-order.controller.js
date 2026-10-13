
const adminOrderService = require("../services/admin-order.service");

const getOrdersPage = async (req, res, next) => {
  const [result, stats] = await Promise.all([
    adminOrderService.getOrders(req.validated.query),
    adminOrderService.getOrderStats()
  ]);
  const viewData = {
    title: "Orders",
    ...result,
    stats
  };


//   console.log("viewdata is: ", viewData)
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
