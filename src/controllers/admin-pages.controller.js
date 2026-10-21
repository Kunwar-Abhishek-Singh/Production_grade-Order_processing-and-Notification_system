
const Admin = require("../models/admin.model");
const AppError = require("../utils/AppError");

const getAdminsPage = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = 10;
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

  const totalPages = Math.ceil(totalAdmins / limit);

  return res.status(200).render("pages/admins", {
    title: "Admin Management",
    admins,
    pagination: {
      page,
      limit,
      totalAdmins,
      totalPages
    }
  });
};

const getEditAdminPage = async (req, res) => {
  const { id } = req.params;

  const admin = await Admin.findById(id)
    .select("_id email role createdAt updatedAt")
    .lean();

  if (!admin) {
    throw new AppError("Admin account not found", 404);
  }

  return res.status(200).render("pages/edit-admin", {
    title: "Edit Admin",
    admin
  });
};

module.exports = {
  getAdminsPage,
  getEditAdminPage
};
