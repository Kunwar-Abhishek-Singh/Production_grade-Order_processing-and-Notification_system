
const { z } = require("zod");

const updateAdminRoleSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(
        /^[0-9a-fA-F]{24}$/,
        "Admin ID must be a valid MongoDB ObjectId"
      )
  }).strict(),

  body: z.object({
    role: z.enum(["admin", "superadmin"])
  }).strict()
});

module.exports = { updateAdminRoleSchema };
