class ApiError extends Error {
  constructor(statusCode, message, details, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends ApiError {
  constructor(message, details) {
    super(400, message, details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Not Found") {
    super(404, message);
  }
}

class InternalServerError extends ApiError {
  constructor(message = "Internal Server Error") {
    super(500, message, undefined, false);
  }
}

module.exports = {
  ApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
};
