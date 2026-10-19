
const SystemGuard = require("../models/system-guard.model");

const ADMIN_ROLE_GUARD_ID = "admin-role-invariant";

const ensureAdminRoleGuardExists = async () => {
  await SystemGuard.updateOne(
    { _id: ADMIN_ROLE_GUARD_ID },
    {
      $setOnInsert: {
        version: 0
      }
    },
    { upsert: true }
  );
};

module.exports = {
  ensureAdminRoleGuardExists
};
