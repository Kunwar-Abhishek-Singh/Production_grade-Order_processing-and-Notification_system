
const { z } = require("zod");

const adminDetailsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(
        /^[0-9a-fA-F]{24}$/,
        "Admin ID must be a valid MongoDB ObjectId"
      )
  }).strict()
});

module.exports = { adminDetailsSchema };
