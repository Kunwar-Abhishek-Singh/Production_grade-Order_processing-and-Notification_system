
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

const getAdmins = async (req, res) => {
  const { page, limit } = req.validated.query;

  const skip = (page - 1) * limit;

  const [admins, totalAdmins] = await Promise.all([
    Admin.find()
      .select("_id email role createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Admin.countDocuments()
  ]);

  return res.status(200).json({
    success: true,
    data: admins.map((admin) => ({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    })),
    pagination: {
      page,
      limit,
      totalAdmins,
      totalPages: Math.ceil(totalAdmins / limit)
    }
  });
};

module.exports = { createAdmin, getAdmins };
