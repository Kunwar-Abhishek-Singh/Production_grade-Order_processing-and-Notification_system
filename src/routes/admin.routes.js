
const express = require("express");

const validate = require("../middleware/validate.middleware");
const asyncHandler = require("../utils/asyncHandler");



const { adminLoginSchema } = require("../validators/admin-login.validator");

const {
  adminOrdersSchema
} = require("../validators/admin-orders.validator");

const {
  getOrdersPage
} = require("../controllers/admin-order.controller");

const {
  getOrderDetailsPage
} = require("../controllers/admin-order-details.controller");

const {
  getLoginPage,
  login
} = require("../controllers/admin-auth.controller");

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

router.get("/login", getLoginPage);

router.post(
  "/login",
  validate(adminLoginSchema),
  asyncHandler(login)
);



module.exports = router;
