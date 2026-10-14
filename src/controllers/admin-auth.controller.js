const Admin = require("../models/admin.model");
const AppError = require("../utils/AppError");

const getLoginPage = (req, res) => {
  res.render("pages/login", {
    title: "Admin Login",
    error: null
  });
};

const login = async (req, res) => {
  const { email, password } = req.validated.body;

  const admin = await Admin.findOne({
    email: email.toLowerCase()
  }).select("+passwordHash");

  // Use the same response for an unknown email and a wrong password.
  if (!admin || !(await admin.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  // Session creation will be added in the next step.
  return res.status(200).json({
    status: "success",
    message: "Credentials verified successfully"
  });
};

module.exports = {
  getLoginPage,
  login
};