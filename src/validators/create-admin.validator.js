
const { z } = require("zod");

const createAdminSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("A valid email address is required")
      .max(254),

    password: z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .max(72, "Password must not exceed 72 characters"),

    role: z
      .enum(["admin", "superadmin"])
      .default("admin")
  }).strict()
});

module.exports = { createAdminSchema };
