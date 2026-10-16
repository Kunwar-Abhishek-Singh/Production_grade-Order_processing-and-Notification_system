
const Admin = require("../models/admin.model");
const AppError = require("../utils/AppError");

const createAdmin = async (req, res) => {
  const { email, password, role } = req.validated.body;

  try {
    const admin = await Admin.create({
      email,
      passwordHash: password,
      role
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("An admin with this email already exists", 409);
    }

    throw error;
  }
};

module.exports = { createAdmin };
