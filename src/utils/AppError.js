
class AppError extends Error {
  constructor(message, statusCode, details = undefined) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    if (details !== undefined) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
