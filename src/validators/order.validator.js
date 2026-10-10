const {z} = require('zod'); //importing the zod library which is used for validation

const createOrderSchema = z.object({
    body: z.object({
        productId: z.string().trim().min(1, {message: "Product ID is required"}), //validating that productId is a non-empty string
        quantity: z.number().int("Quantity must be an Integer").positive("Quantity must be greater than Zero"),
        email: z.string().trim().email("Invalid email address")
    })
});

module.exports = {
    createOrderSchema
};