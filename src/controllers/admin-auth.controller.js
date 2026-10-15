
const Admin = require("../models/admin.model");
const AppError = require("../utils/AppError");
const config = require("../config/env");

const getLoginPage = (req, res) => {
  res.render("pages/login", {
    title: "Admin Login",
    error: null
  });
};

const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      resolve();
    });
  });

const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) return reject(error);
      resolve();
    });
  });

const login = async (req, res) => {
  const { email, password } = req.validated.body;

  const admin = await Admin.findOne({
    email: email.toLowerCase()
  }).select("+passwordHash");

  if (!admin || !(await admin.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  // Prevent session fixation.
  await regenerateSession(req);

  // Store only the data required by the application.
  req.session.admin = {
    id: admin._id.toString(),
    role: admin.role
  };

  // Persist the session to Redis before redirecting.
  await saveSession(req);

  return res.redirect("/admin/orders");
};


const logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("order.sid", {
      httpOnly: true,
      secure: config.server.nodeEnv === "production",
      sameSite: "lax"
    });

    return res.redirect("/admin/login");
  });
};


module.exports = {
  getLoginPage,
  login,
  logout
};
