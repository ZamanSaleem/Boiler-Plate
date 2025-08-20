module.exports = function softDeletePlugin(schema) {
  if (!schema.path("isDeleted")) {
    schema.add({
      isDeleted: { type: Boolean, default: false, select: false },
      deletedAt: { type: Date, select: false },
    });
  }

  schema.index({ isDeleted: 1 });
  schema.index({ deletedAt: 1 });

  const baseFind = mongoose.Model.find;
  const baseCountDocuments = mongoose.Model.countDocuments;

  schema.statics.findWithDeleted = function (query = {}, projection, options) {
    return baseFind.call(this, query, projection, options);
  };

  schema.statics.findDeleted = function (query = {}, projection, options) {
    return baseFind.call(this, { ...query, isDeleted: true }, projection, options);
  };

  schema.statics.find = function (query = {}, projection, options) {
    return baseFind.call(this, { ...query, isDeleted: { $ne: true } }, projection, options);
  };

  schema.statics.countWithDeleted = function (query = {}) {
    return baseCountDocuments.call(this, query);
  };

  schema.statics.countDeleted = function (query = {}) {
    return baseCountDocuments.call(this, { ...query, isDeleted: true });
  };

  schema.statics.countDocuments = function (query = {}) {
    return baseCountDocuments.call(this, { ...query, isDeleted: { $ne: true } });
  };

  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    return this.save();
  };

  schema.methods.isSoftDeleted = function () {
    return !!this.isDeleted;
  };

  schema.query.withDeleted = function () {
    return this.where({ isDeleted: { $exists: true } });
  };

  schema.query.onlyDeleted = function () {
    return this.where({ isDeleted: true });
  };

  schema.query.notDeleted = function () {
    return this.where({ isDeleted: { $ne: true } });
  };

  schema.pre("aggregate", function () {
    const pipeline = this.pipeline();
    const hasDeletedFilter = pipeline.some((stage) => stage.$match && stage.$match.isDeleted !== undefined);
    if (!hasDeletedFilter) {
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });

  schema.pre("deleteOne", { document: true, query: false }, async function (next) {
    if (!this.isDeleted) {
      await this.softDelete();
    }
    next(new Error("Document was soft deleted instead of being removed"));
  });

  schema.pre("deleteMany", async function (next) {
    await this.model.updateMany(this.getFilter(), {
      $set: { isDeleted: true, deletedAt: new Date() },
    });
    next(new Error("Documents were soft deleted instead of being removed"));
  });
};

const mongoose = require("mongoose"); 
