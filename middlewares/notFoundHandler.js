const { NotFoundError } = require("../utils/apiError");

const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError("Route not found");
  next(error);
};

module.exports = { notFoundHandler };
