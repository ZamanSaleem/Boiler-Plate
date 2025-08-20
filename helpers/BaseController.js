const { ApiError } = require("../utils/apiError.js");
const httpStatus = require("http-status");
const { StatusCodes } = require("http-status-codes");

class BaseController {
  constructor(model) {
    this.model = model;
    if (!this.model) {
      throw new Error("Model must be provided to BaseController");
    }
    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getEvery = this.getEvery.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.count = this.count.bind(this);
    this.loadRecord = this.loadRecord.bind(this);

  }

  /**
   * Success response handler
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {number} statusCode - HTTP status code
   */

  sendResponse(res, data, statusCode = StatusCodes.OK) {
    const validStatusCode = Number.isInteger(statusCode)
      ? statusCode
      : StatusCodes.OK;

    res.status(validStatusCode).json({
      success: true,
      data,
    });
  }

  /**
   * Error response handler
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   */

  sendError(res, error) {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Internal Server Error";

    const response = {
      status: "error",
      message,
      ...(error.details && { details: error.details }),
    };

    if (process.env.NODE_ENV === "development") {
      response.stack = error.stack;
    }

    res.status(statusCode).json(response);
  }

  // ================ CRUD OPERATIONS ================

  /**
   * Create new record
   */
  async create(req, res) {
    // const $this = this;
    // console.log("this", $this);
    try {
      const { tenantId } = req;
      const record = await this.model.create(req.body, tenantId);
      this.sendResponse(res, record, StatusCodes.CREATED);
    } catch (error) {
      console.log("error is:", error)
      this.sendError(res, error);
    }
  }

  /**
   * Get all records (with pagination, filtering, sorting)
   */
  async getAll(req, res) {
    try {
      const { tenantId } = req;
      const { page = 1, limit = 10, ...filters } = req.query;

      const result = await this.model.paginate(
        {
          ...filters,
          page: parseInt(page),
          limit: parseInt(limit),
          sort: req.query.sort || { createdAt: -1 },
        },
        tenantId
      );

      this.sendResponse(res, {
        items: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev,
        },
      });
    } catch (error) {
      console.log("error is:", error);
      this.sendError(res, error);
    }
  }

  /**
 * Get all records without pagination (used for dropdowns, lists, etc.)
 */
  async getEvery(req, res) {
    try {
      const { tenantId } = req;
      const filters = { ...req.query };

      const records = await this.model.find(filters, {}, tenantId);

      console.log("Here are records:", records);

      this.sendResponse(res, records);
    } catch (error) {
      this.sendError(res, error);
    }
  }


  /**
   * Get single record by ID
   */
  async getById(req, res) {
    try {
      const { tenantId } = req;
      const { id } = req.params;
      const record = await this.model.findById(id, {}, tenantId);

      if (!record) {
        throw new ApiError(httpStatus.NOT_FOUND, "Record not found", {});
      }

      this.sendResponse(res, record);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  /**
   * Update record
   */
  async update(req, res) {
    try {
      const { tenantId } = req;
      const { id } = req.params;
      const updatedRecord = await this.model.updateById(
        id,
        req.body,
        { new: true },
        tenantId
      );

      if (!updatedRecord) {
        throw new ApiError(httpStatus.NOT_FOUND, "Record not found", {});
      }

      this.sendResponse(res, updatedRecord);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  /**
   * Delete record
   */
  async delete(req, res) {
    try {
      const { tenantId } = req;
      const { id } = req.params;
      const deletedRecord = await this.model.deleteById(id, {}, tenantId);

      if (!deletedRecord) {
        throw new ApiError(httpStatus.NOT_FOUND, "Record not found", {});
      }
      console.log("error is:", deletedRecord)

      this.sendResponse(res, { id }, StatusCodes.OK);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  /**
   * Middleware to load record by ID (for routes that need the record)
   */
  async loadRecord(req, res, next, id) {
    try {
      const { tenantId } = req;
      const record = await this.model.findById(id, {}, tenantId);

      if (!record) {
        throw new ApiError(httpStatus.NOT_FOUND, "Record not found", {});
      }

      req.record = record;
      next();
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async count(req, res) {
    try {
      const { tenantId } = req.params;
      const count = await this.model.count(req.query, tenantId);
      this.sendResponse(res, { count });
    } catch (error) {
      this.sendError(res, error);
    }
  }
}

module.exports = BaseController;
