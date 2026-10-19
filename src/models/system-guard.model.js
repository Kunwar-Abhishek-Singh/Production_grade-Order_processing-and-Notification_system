
const mongoose = require("mongoose");

const systemGuardSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "admin-role-invariant"
    },
    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const SystemGuard = mongoose.model(
  "SystemGuard",
  systemGuardSchema
);

module.exports = SystemGuard;
