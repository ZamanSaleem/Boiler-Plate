const mongoose = require("mongoose");
const Database = require("../config/Database");
const SoftDeletePlugin = require("../plugins/SoftDeletePlugin");
const ErrorHandlingPlugin = require("../plugins/ErrorHandlingPlugin");

class BaseModel {
  /**
   * Initialize a new model
   * @param {Object} options
   * @param {string} options.modelName - Name of the model
   * @param {Object} options.schemaDefinition - Mongoose schema definition
   * @param {Object} [options.schemaOptions] - Additional schema options
   * @param {boolean} [options.isTenantSpecific=false] - Whether the model is tenant-specific
   * @param {Array} [options.virtuals] - Array of virtual fields to add
   * @param {Array} [options.preHooks] - Array of pre hooks to add
   * @param {Array} [options.postHooks] - Array of post hooks to add
   * @param {Function} [options.watch] - Change stream callback
   * @param {boolean} [options.autoIncrement=true] - Enable auto-increment ID
   * @param {boolean} [options.softDelete=true] - Enable soft delete
   */
  constructor(options) {
    if (!options || !options.modelName || !options.schemaDefinition) {
      throw new Error("modelName and schemaDefinition are required");
    }

    this.modelName = options.modelName;
    this.isTenantSpecific = options.isTenantSpecific || false;
    this.autoIncrement = options.autoIncrement !== false;
    this.softDelete = options.softDelete !== false;

    // Add tenant_id field if model is tenant-specific
    if (this.isTenantSpecific) {
      options.schemaDefinition.tenant_id = {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      };
    }

    // Add common fields
    options.schemaDefinition = {
      ...options.schemaDefinition,
      ...(this.autoIncrement
        ? {
          id: {
            type: Number,
            unique: true,
            index: true,
            immutable: true,
          },
        }
        : {}),
      ...(this.softDelete
        ? {
          isDeleted: {
            type: Boolean,
            default: false,
            select: false,
          },
          deletedAt: {
            type: Date,
            select: false,
          },
        }
        : {}),
    };

    // Default schema options
    const defaultSchemaOptions = {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
      collection: this.modelName,
      ...(options.schemaOptions || {}),
    };



    this.schema = new mongoose.Schema(
      options.schemaDefinition,
      defaultSchemaOptions
    );

    // Add plugins
    if (this.softDelete) {
      this.schema.plugin(SoftDeletePlugin);
    }
    this.schema.plugin(ErrorHandlingPlugin);

    // Add virtuals
    if (options.virtuals && Array.isArray(options.virtuals)) {
      options.virtuals.forEach((virtual) => {
        this.schema.virtual(virtual.name).get(virtual.get);
      });
    }

    // Add pre hooks
    if (options.preHooks && Array.isArray(options.preHooks)) {
      options.preHooks.forEach((hook) => {
        this.schema.pre(hook.name, hook.fn);
      });
    }

    // Add post hooks
    if (options.postHooks && Array.isArray(options.postHooks)) {
      options.postHooks.forEach((hook) => {
        this.schema.post(hook.name, hook.fn);
      });
    }

    // Auto-increment ID hook
    if (this.autoIncrement) {
      this.schema.pre(
        ["save", "insertMany", "validate"],
        async function (next) {
          if (!this.isNew && !this.isModified("id")) return next();

          try {
            const lastDoc = await this.constructor.findOne({}).sort("-id");
            this.id = lastDoc ? lastDoc.id + 1 : 1;
            next();
          } catch (err) {
            next(err);
          }
        }
      );
    }

    if (options.methods) {
      this.schema.methods = options.methods;
    }

    // Register the model
    this.model = Database.registerModel(this.modelName, this.schema);

    // Set up change stream if requested
    if (options.watch && typeof options.watch === "function") {
      const changeStream = this.model.watch();
      changeStream.on("change", options.watch);
    }
  }

  // ================ HELPER METHODS ================

  /**
   * Inject tenant_id into data if model is tenant-specific
   * @param {Object} data - Data to inject tenant_id into
   * @param {string} [tenantId] - Tenant ID (optional)
   */
  injectTenantId(data, tenantId) {
    if (!this.isTenantSpecific || !tenantId) return data;
    return { ...data, tenant_id: tenantId };
  }

  /**
   * Build a tenant-aware query
   * @param {Object} query - Base query
   * @param {string} [tenantId] - Tenant ID (optional)
   */
  buildTenantQuery(query = {}, tenantId) {
    if (!this.isTenantSpecific || !tenantId) return query;
    return { ...query, tenant_id: tenantId };
  }

  /**
   * Prepare query from request object
   * @param {Object} req - Request object
   */
  prepareQuery(req) {
    let query = { $and: [] };
    let fields = {};
    let sort = { _id: -1 };
    let page = parseInt(req.query.page) || 1;
    let limit = Math.min(parseInt(req.query.limit) || 25, 250);

    // Process query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (!value || ["page", "limit", "sort", "fields"].includes(key)) continue;

      if (key === "q" && req.query.qMatchWith) {
        // Search across multiple fields
        const searchFields = req.query.qMatchWith.split(",");
        const searchQueries = searchFields.map((field) => ({
          [field]: { $regex: value, $options: "i" },
        }));
        query.$and.push({ $or: searchQueries });
      } else if (key.includes(".")) {
        // Handle nested/operator queries
        const [field, operator] = key.split(".");
        if (operator === "in") {
          query[field] = { $in: value.split(",") };
        } else {
          query[field] = { [operator]: isNaN(value) ? value : Number(value) };
        }
      } else {
        // Simple equality
        query[key] = isNaN(value) ? value : Number(value);
      }
    }

    // Handle empty $and
    if (query.$and.length === 0) {
      delete query.$and;
    }

    // Handle fields selection
    if (req.query.fields) {
      req.query.fields.split(",").forEach((field) => {
        fields[field] = 1;
      });
    }

    return {
      query,
      fields,
      sort,
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  // ================ CRUD OPERATIONS ================

  async create(data, tenantId) {
    const payload = this.injectTenantId(data, tenantId);
    return await this.model.create(payload);
  }

  async insertMany(items, tenantId) {
    const payload = items.map((item) => this.injectTenantId(item, tenantId));
    return await this.model.insertMany(payload);
  }

  async find(query = {}, options = {}, tenantId) {
    const finalQuery = this.buildTenantQuery(query, tenantId);
    return await this.model.find(finalQuery, null, options);
  }

  async findById(id, options = {}, tenantId) {
    const query = this.buildTenantQuery({ _id: id }, tenantId);
    return await this.model.findOne(query, null, options);
  }

  async findOne(query = {}, options = {}, tenantId) {
    const finalQuery = this.buildTenantQuery(query, tenantId);
    return await this.model.findOne(finalQuery, null, options);
  }

  async updateOne(filter, update, options = {}, tenantId) {
    const finalFilter = this.buildTenantQuery(filter, tenantId);
    return await this.model.updateOne(finalFilter, update, {
      new: true,
      ...options,
    });
  }

  async updateById(id, update, options = {}, tenantId) {
    return await this.updateOne({ _id: id }, update, options, tenantId);
  }

  async updateMany(filter, update, options = {}, tenantId) {
    const finalFilter = this.buildTenantQuery(filter, tenantId);
    return await this.model.updateMany(finalFilter, update, options);
  }

  async deleteOne(filter, options = {}, tenantId) {
    if (this.softDelete) {
      return await this.updateOne(
        filter,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        options,
        tenantId
      );
    }
    const finalFilter = this.buildTenantQuery(filter, tenantId);
    return await this.model.deleteOne(finalFilter, options);
  }

  async deleteById(id, options = {}, tenantId) {
    return await this.deleteOne({ _id: id }, options, tenantId);
  }

  async deleteMany(filter, options = {}, tenantId) {
    if (this.softDelete) {
      return await this.updateMany(
        filter,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        options,
        tenantId
      );
    }
    const finalFilter = this.buildTenantQuery(filter, tenantId);
    return await this.model.deleteMany(finalFilter, options);
  }

  async count(query = {}, tenantId) {
    const finalQuery = this.buildTenantQuery(query, tenantId);
    return await this.model.countDocuments(finalQuery);
  }

  async aggregate(pipeline = [], tenantId) {
    if (this.isTenantSpecific && tenantId) {
      // Add tenant match at beginning of pipeline if not already present
      const hasTenantMatch = pipeline.some(
        (stage) => stage.$match && stage.$match.tenant_id
      );

      if (!hasTenantMatch) {
        pipeline.unshift({ $match: { tenant_id: tenantId } });
      }
    }
    return await this.model.aggregate(pipeline);
  }

  // ================ PAGINATION METHODS ================

  async paginate(
    {
      query = {},
      page = 1,
      limit = 10,
      sort = { _id: -1 },
      select = {},
      populate = [],
    } = {},
    tenantId
  ) {
    const finalQuery = this.buildTenantQuery(query, tenantId);

    const [total, items] = await Promise.all([
      this.model.countDocuments(finalQuery),
      this.model
        .find(finalQuery)
        .select(select)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(populate),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
    };
  }

  async lookup(req, tenantId) {
    const { query, fields, page, limit, sort } = this.prepareQuery(req);
    const finalQuery = this.buildTenantQuery(query, tenantId);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.model.countDocuments(finalQuery),
      this.model
        .find(finalQuery)
        .select(fields)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean(),
    ]);

    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      pages,
      page,
      limit,
      total,
      prev: hasPrev ? `?limit=${limit}&page=${page - 1}` : undefined,
      next: hasNext ? `?limit=${limit}&page=${page + 1}` : undefined,
      items,
      count: items.length,
    };
  }

  // ================ BULK OPERATIONS ================

  async bulkWrite(operations, options = {}, tenantId) {
    if (this.isTenantSpecific && tenantId) {
      operations = operations.map((op) => {
        const opType = Object.keys(op)[0];
        const opData = op[opType];

        // Add tenant_id to filter for update/delete/replace operations
        if (
          [
            "updateOne",
            "updateMany",
            "deleteOne",
            "deleteMany",
            "replaceOne",
          ].includes(opType)
        ) {
          opData.filter = this.buildTenantQuery(opData.filter, tenantId);
        }

        // Add tenant_id to document for insert operations
        if (opType === "insertOne") {
          opData.document = this.injectTenantId(opData.document, tenantId);
        }

        return op;
      });
    }

    return await this.model.bulkWrite(operations, options);
  }

  async bulkCreate(items, tenantId) {
    let id = await this.incrementId();
    const payload = items.map((item, index) => {
      return this.injectTenantId(
        {
          ...item,
          id: id + index,
        },
        tenantId
      );
    });
    return await this.model.insertMany(payload);
  }

  async bulkUpdate(items, tenantId) {
    const operations = items.map((item) => ({
      updateOne: {
        filter: this.buildTenantQuery(item.filter, tenantId),
        update: item.update,
      },
    }));
    return await this.model.bulkWrite(operations);
  }

  // ================ UTILITY METHODS ================

  async exists(query, tenantId) {
    const finalQuery = this.buildTenantQuery(query, tenantId);
    return (await this.model.countDocuments(finalQuery)) > 0;
  }

  async distinct(field, query = {}, tenantId) {
    const finalQuery = this.buildTenantQuery(query, tenantId);
    return await this.model.distinct(field, finalQuery);
  }

  async incrementId() {
    const lastDoc = await this.model.findOne({}).sort("-id");
    return lastDoc ? lastDoc.id + 1 : 1;
  }

  startSession() {
    return this.model.startSession();
  }

  watch(pipeline = [], options = {}) {
    return this.model.watch(pipeline, options);
  }

  // Mongoose model methods passthrough
  getModel() {
    return this.model;
  }

  // Alias for getModel()
  get db() {
    return this.model;
  }
}

module.exports = BaseModel;
