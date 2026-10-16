
const express = require("express");

const validate = require("../middleware/validate.middleware");
const asyncHandler = require("../utils/asyncHandler");

const requireAdmin = require("../middleware/require-admin.middleware");

const redirectIfAuthenticated = require(
  "../middleware/redirect-if-authenticated.middleware"
);


const authorizeRoles = require(
  "../middleware/authorize-roles.middleware"
);

const { adminLoginSchema } = require("../validators/admin-login.validator");

const {
  adminOrdersSchema
} = require("../validators/admin-orders.validator");

const {
  createAdminSchema
} = require("../validators/create-admin.validator");

const { adminListSchema } = require(
  "../validators/admin-list.validator"
);

const {
  adminDetailsSchema
} = require("../validators/admin-details.validator");

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

const {
  createAdmin,
  getAdmins,
  getAdminById
} = require("../controllers/admin-management.controller");



const router = express.Router();



router.get(
  "/login",
  redirectIfAuthenticated,
  getLoginPage
);

router.post(
  "/login",
  validate(adminLoginSchema),
  asyncHandler(login)
);

router.post("/logout", requireAdmin, logout);

router.post(
  "/admins",
  requireAdmin,
  authorizeRoles("superadmin"),
  validate(createAdminSchema),
  asyncHandler(createAdmin)
);

// List admin accounts, accessible only to superadmins.
router.get(
  "/admins",
  requireAdmin,
  authorizeRoles("superadmin"),
  validate(adminListSchema),
  asyncHandler(getAdmins)
);


router.get(
  "/admins/:id",
  requireAdmin,
  authorizeRoles("superadmin"),
  validate(adminDetailsSchema),
  asyncHandler(getAdminById)
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
