
const { z } = require("zod");

const adminOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),

    status: z.preprocess(
      (value) => value === "" ? undefined : value,
      z.enum([
        "pending",
        "processing",
        "completed",
        "failed"
      ]).optional()
    ),

    search: z.string().trim().max(100).optional()
  })
});

module.exports = { adminOrdersSchema };
