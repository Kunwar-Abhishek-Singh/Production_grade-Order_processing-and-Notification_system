
const Admin = require("../models/admin.model");

const createAdmin = async (req, res) => {
  const { email, password, role } = req.validated.body;

  const admin = await Admin.create({
    email,
    passwordHash: password,
    role
  });

  res.status(201).json({
    success: true,
    message: "Admin account created successfully",
    data: {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt
    }
  });
};

module.exports = {
  createAdmin
};
