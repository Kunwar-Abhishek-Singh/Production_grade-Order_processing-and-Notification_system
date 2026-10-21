
const mongoose = require("mongoose");
const Admin = require("../models/admin.model");
const AppError = require("../utils/AppError");

// Render a page inside the shared main layout.
const renderAdminPage = (res, next, view, viewData) => {
  res.render(view, viewData, (err, pageHtml) => {
    if (err) return next(err);

    res.render(
      "layouts/main",
      {
        ...viewData,
        body: pageHtml
      },
      (layoutError, html) => {
        if (layoutError) return next(layoutError);
        res.send(html);
      }
    );
  });
};

// GET /admin/admins
const getAdminsPage = async (req, res, next) => {
  try {
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

    return renderAdminPage(res, next, "pages/admins", {
      title: "Admin Management",
      admins,
      pagination: { page, limit, totalAdmins, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/admins/new
const getNewAdminPage = (req, res, next) => {
  return renderAdminPage(res, next, "pages/new-admin", {
    title: "Create Admin",
    error: null,
    formData: { email: "", role: "admin" }
  });
};

// GET /admin/admins/:id/edit
const getEditAdminPage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Invalid admin account ID", 400);
    }

    const admin = await Admin.findById(id)
      .select("_id email role createdAt updatedAt")
      .lean();

    if (!admin) {
      throw new AppError("Admin account not found", 404);
    }

    return renderAdminPage(res, next, "pages/edit-admin", {
      title: "Edit Admin",
      admin,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminsPage,
  getNewAdminPage,
  getEditAdminPage
};
