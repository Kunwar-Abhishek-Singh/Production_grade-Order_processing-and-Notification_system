class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = true; // Marking this error as operational, meaning it is a known error that can be handled gracefully

        Error.captureStackTrace(this, this.contructor); // Capturing the stack trace for this error, excluding the constructor from the stack trace
    }
}

module.exports = AppError; // Exporting the AppError class to be used in other files