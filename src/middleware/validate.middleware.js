const AppError = require("../utils/AppError");

const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query
        }); // Validate the request body against the provided schema using Zod's safeParse method

        if (!result.success){
            const message = result.error.issues
                .map((issue) => {
                    const field = issue.path.join('.'); // Join the path array to get the field name
                    return `${field}: ${issue.message}`; // Create a message for each validation issue
                })
                .join(', '); // Join all messages with a comma and space

               return next(new AppError(message, 400)); // If validation fails, create a new AppError with the message and status code 400 (Bad Request) and pass it to the next middleware 
        }

        req.validated = result.data; // If validation succeeds, attach the validated data to req.validated for use in the next middleware or route handler
        next(); // Call the next middleware or route handler
    }
}