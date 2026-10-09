const asyncHandler = (handler) => {
    return (req, res, next) => {
        Promise
            .resolve(handler(req, res, next))
            .catch(next); // If the handler throws an error, it will be caught and passed to the next middleware (error handler)
    };
};

module.exports = asyncHandler; // Exporting the asyncHandler function to be used in other files