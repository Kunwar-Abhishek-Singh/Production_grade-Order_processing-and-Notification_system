
const express = require("express");

const validate = require("../middleware/validate.middleware");
const asyncHandler = require("../utils/asyncHandler");

const requireAdmin = require("../middleware/require-admin.middleware");

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
  login,
  logout
} = require("../controllers/admin-auth.controller");

const router = express.Router();



router.get("/login", getLoginPage);

router.post(
  "/login",
  validate(adminLoginSchema),
  asyncHandler(login)
);

// Protect order dashboard and all nested order routes.
router.use("/orders", requireAdmin);

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
