const errorHandler = (err, req, res, next) => {
    const statusCode = err. statusCode || 500; // If the error has a statusCode, use it, otherwise default to 500 (Internal Server Error)

    res.status(statusCode).json({
        status: "error",
        message: err.message || "Internal Server Error" // If the error has a message, use it, otherwise default to "Internal Server Error"
    });
};

module.exports = errorHandler; // Exporting the errorHandler function to be used in other files