require("dotenv").config();

const mongoose = require("mongoose");
const config = require("../src/config/env");
const Admin = require("../src/models/admin.model");

const seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured");
    }

    if (!config.config.database.mongodbUri) {
      throw new Error("MONGODB_URI is not configured");
    }

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters");
    }

    await mongoose.connect(config.config.database.mongodbUri);

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log("Admin account already exists. No changes made.");
      return;
    }

    await Admin.create({
      email,
      passwordHash: password,
      role: "superadmin"
    });

    console.log("Initial admin account created successfully.");
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

seedAdmin();