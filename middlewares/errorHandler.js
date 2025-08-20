const { ApiError } = require("../utils/apiError");
const  config  = require("../config/config");

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = "Internal server error";
  let details = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message;
  }

  const response = {
    status: "error",
    message,
    details,
  };

  if (config.env === "development") {
    response.stack = err instanceof Error ? err.stack : undefined;
  }

  res.status(statusCode).json(response);
};

module.exports = { errorHandler };
