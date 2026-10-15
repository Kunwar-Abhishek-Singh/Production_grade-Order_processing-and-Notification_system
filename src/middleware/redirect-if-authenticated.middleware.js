const redirectIfAuthenticated = (req, res, next) => {
  if (req.session?.admin) {
    return res.redirect("/admin/orders");
  }

  next();
};

module.exports = redirectIfAuthenticated;