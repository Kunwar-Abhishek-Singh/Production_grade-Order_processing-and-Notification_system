
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;

  const response = {
    status: "error",
    message: err.isOperational
      ? err.message
      : "Internal Server Error"
  };

  if (err.isOperational && err.details) {
    response.errors = err.details;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
