
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


const getAdminById = async (req, res) => {
  const { id } = req.validated.params;

  const admin = await Admin.findById(id)
    .select("_id email role createdAt updatedAt")
    .lean();

  if (!admin) {
    throw new AppError("Admin account not found", 404);
  }

  return res.status(200).json({
    success: true,
    data: {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    }
  });
};


const updateAdminRole = async (req, res) => {
  const { id } = req.validated.params;
  const { role } = req.validated.body;
  const requesterId = req.session.admin.id;

  const targetAdmin = await Admin.findById(id);

  if (!targetAdmin) {
    throw new AppError("Admin account not found", 404);
  }

  // Prevent a superadmin from demoting their own account.
  if (requesterId === targetAdmin._id.toString() && role !== "superadmin") {
    throw new AppError("You cannot demote your own superadmin account", 400);
  }

  // If a superadmin is being demoted, ensure another one exists.
  if (targetAdmin.role === "superadmin" && role !== "superadmin") {
    const otherSuperadminCount = await Admin.countDocuments({
      role: "superadmin",
      _id: { $ne: targetAdmin._id }
    });

    if (otherSuperadminCount === 0) {
      throw new AppError(
        "Cannot demote the last superadmin account",
        409
      );
    }
  }

  targetAdmin.role = role;
  await targetAdmin.save();

  return res.status(200).json({
    success: true,
    message: "Admin role updated successfully",
    data: {
      id: targetAdmin._id,
      email: targetAdmin.email,
      role: targetAdmin.role,
      updatedAt: targetAdmin.updatedAt
    }
  });
};



module.exports = { createAdmin, getAdmins, getAdminById, updateAdminRole};
