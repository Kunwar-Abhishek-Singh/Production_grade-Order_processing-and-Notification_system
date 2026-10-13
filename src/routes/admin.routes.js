
const express = require("express");

const validate = require("../middleware/validate.middleware");
const asyncHandler = require("../utils/asyncHandler");

const {
  adminOrdersSchema
} = require("../validators/admin-orders.validator");

const {
  getOrdersPage
} = require("../controllers/admin-order.controller");

const router = express.Router();

router.get(
  "/orders",
  validate(adminOrdersSchema),
  asyncHandler(getOrdersPage)
);

module.exports = router;
