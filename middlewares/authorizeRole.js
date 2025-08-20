const { ApiError } = require("../utils/apiError");
const { StatusCodes } = require("http-status-codes");

const authorizeRole = (...roles) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user || !roles.includes(user.role)) {
            return next(
                new ApiError(
                    StatusCodes.FORBIDDEN,
                    `Access denied. Allowed roles: ${roles.join(", ")}`
                )
            );
        }

        next();
    };
};

module.exports = authorizeRole;
