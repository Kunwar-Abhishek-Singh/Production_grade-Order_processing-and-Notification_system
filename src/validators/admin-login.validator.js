const { z } = require("zod");

const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Invalid email address").max(254),
    password: z.string().min(1, "Password is required").max(128)
  }).strict()
});

module.exports = { adminLoginSchema };