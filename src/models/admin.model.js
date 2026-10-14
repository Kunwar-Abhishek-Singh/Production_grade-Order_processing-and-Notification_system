const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false
    },

    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Hash the password only when it has been changed.
adminSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;

  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Verify a plain-text password against the stored hash.
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;