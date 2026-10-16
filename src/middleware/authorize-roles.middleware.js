
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Verify authentication
    if (!req.session?.admin) {
      return res.redirect("/admin/login");
    }

    // 2. Verify authorization
    if (!allowedRoles.includes(req.session.admin.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action"
      });
    }

    // 3. Allow the request to continue
    next();
  };
};

module.exports = authorizeRoles;
