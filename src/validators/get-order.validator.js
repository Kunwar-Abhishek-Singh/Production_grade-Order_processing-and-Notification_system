const {z} = require('zod'); //importing the zod library which is used for validation

const getOrderByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(
      /^[0-9a-fA-F]{24}$/,
      "Invalid order ID"
    )
  })
});


module.exports = {
    getOrderByIdSchema
}