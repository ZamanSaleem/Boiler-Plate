// plugins/ErrorHandlingPlugin.js
const mongoose = require("mongoose");

module.exports = function errorHandlingPlugin(schema) {
  // Add static methods for error handling
  schema.statics = {
    ...schema.statics,

    // Wrapper for find with better error handling
    safeFind: async function (query, projection, options) {
      try {
        return await this.find(query, projection, options);
      } catch (error) {
        throw this.transformError(error);
      }
    },

    // Wrapper for findOne with better error handling
    safeFindOne: async function (query, projection, options) {
      try {
        return await this.findOne(query, projection, options);
      } catch (error) {
        throw this.transformError(error);
      }
    },

    // Wrapper for save with better error handling
    safeSave: async function (doc) {
      try {
        return await doc.save();
      } catch (error) {
        throw this.transformError(error);
      }
    },

    // Wrapper for update operations with better error handling
    safeUpdate: async function (filter, update, options) {
      try {
        return await this.updateOne(filter, update, options);
      } catch (error) {
        throw this.transformError(error);
      }
    },

    // Wrapper for delete operations with better error handling
    safeDelete: async function (filter) {
      try {
        return await this.deleteOne(filter);
      } catch (error) {
        throw this.transformError(error);
      }
    },

    // Transform Mongoose errors to more user-friendly format
    transformError: function (error) {
      if (!error) return null;

      // Handle validation errors
      if (error instanceof mongoose.Error.ValidationError) {
        const errors = {};
        for (const field in error.errors) {
          errors[field] = {
            message: error.errors[field].message,
            kind: error.errors[field].kind,
            path: error.errors[field].path,
            value: error.errors[field].value,
          };
        }
        return {
          name: "ValidationError",
          message: "Document validation failed",
          statusCode: 400,
          errors,
        };
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        const keyValue = error.keyValue || {};
        const keys = Object.keys(keyValue);
        return {
          name: "DuplicateKeyError",
          message: `Duplicate value for ${keys.join(", ")}`,
          statusCode: 409,
          keyValue,
          keys,
        };
      }

      // Handle CastError (invalid ID format, etc.)
      if (error instanceof mongoose.Error.CastError) {
        return {
          name: "CastError",
          message: `Invalid ${error.kind} value for ${error.path}`,
          statusCode: 400,
          kind: error.kind,
          path: error.path,
          value: error.value,
        };
      }

      // Handle DocumentNotFoundError
      if (error instanceof mongoose.Error.DocumentNotFoundError) {
        return {
          name: "DocumentNotFoundError",
          message: error.message || "Document not found",
          statusCode: 404,
        };
      }

      // For other errors, return as-is but with status code
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      return error;
    },
  };

  // Add instance methods for error handling
  schema.methods = {
    ...schema.methods,

    // Safe save with error transformation
    safeSave: async function () {
      try {
        return await this.save();
      } catch (error) {
        throw this.constructor.transformError(error);
      }
    },

    // Safe remove with error transformation
    safeRemove: async function () {
      try {
        return await this.remove();
      } catch (error) {
        throw this.constructor.transformError(error);
      }
    },
  };

  // Add query helpers for error handling
  schema.query = {
    ...schema.query,

    // Execute query with error handling
    safeExec: async function () {
      try {
        return await this.exec();
      } catch (error) {
        throw this.model.transformError(error);
      }
    },
  };

  // Middleware to transform errors before they're thrown
  schema.post("save", function (error, doc, next) {
    if (error) {
      next(doc.constructor.transformError(error));
    } else {
      next();
    }
  });

  schema.post("update", function (error, res, next) {
    if (error) {
      next(this.model.transformError(error));
    } else {
      next();
    }
  });

  schema.post("remove", function (error, doc, next) {
    if (error) {
      next(doc.constructor.transformError(error));
    } else {
      next();
    }
  });
};
