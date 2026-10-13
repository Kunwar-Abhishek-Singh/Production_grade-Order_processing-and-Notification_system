
const express = require("express");

const validate = require("../middleware/validate.middleware");
const asyncHandler = require("../utils/asyncHandler");

const {
  adminOrdersSchema
} = require("../validators/admin-orders.validator");

const {
  getOrdersPage
} = require("../controllers/admin-order.controller");

const {
  getOrderDetailsPage
} = require("../controllers/admin-order-details.controller");

const router = express.Router();

router.get(
  "/orders",
  validate(adminOrdersSchema),
  asyncHandler(getOrdersPage)
);

router.get(
  "/orders/:id",
  validate(adminOrdersSchema),
  asyncHandler(getOrderDetailsPage)
);

module.exports = router;
