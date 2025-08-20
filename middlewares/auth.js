const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/apiError");
const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const config = require("../config/config");

const authenticate = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Not authorized to access this route"));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new ApiError(StatusCodes.UNAUTHORIZED, "User belonging to this token no longer exists")
      );
    }

    if (user.status !== "ACTIVE") {
      return next(
        new ApiError(StatusCodes.FORBIDDEN, `User account is ${user.status.toLowerCase()}`)
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Not authorized to access this route"));
  }
};

module.exports = { authenticate };

