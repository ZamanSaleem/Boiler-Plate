const mongoose = require("mongoose");

class Database {
  constructor() {
    this.connection = null;
    this.models = {};
  }

  async connect(uri, options = {}) {
    this.connection = await mongoose.connect(uri, options);
    console.log("Connected to database");
    return this.connection;
  }

  registerModel(modelName, schema) {
    if (this.models[modelName]) {
      return this.models[modelName];
    }
    this.models[modelName] = mongoose.model(modelName, schema);
    return this.models[modelName];
  }

  getModel(modelName) {
    if (!this.models[modelName]) {
      throw new Error(`Model ${modelName} not registered`);
    }
    return this.models[modelName];
  }
}

module.exports = new Database();
