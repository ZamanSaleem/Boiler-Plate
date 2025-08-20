const _enum = require("../config/enum");
const BaseModel = require("../helpers/BaseModel");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

class User extends BaseModel {
  constructor() {
    const userSchema = {
      email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, "is invalid"],
        index: true,
      },
      password: {
        type: String,
        required: true,
        minlength: 8,
        select: false,
      },
      role: {
        type: String,
        enum: _enum.ROLES,
        default: "USER",
        index: true,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      profile: {
        firstName: {
          type: String,
          trim: true,
        },
        lastName: {
          type: String,
          trim: true,
        },
        avatar: String,
      },
      lastLogin: {
        type: Date,
        select: false,
      },
      loginAttempts: {
        type: Number,
        default: 0,
        select: false,
      },
      otp: {
        type: String,
        // select: false,
      },
      otpExpires: {
        type: Date,
        // select: false,
      },
      resetPasswordToken: {
        type: String,
        select: false,
      },
      resetPasswordExpires: {
        type: Date,
        select: false,
      },
      status: {
        type: String,
        enum: _enum.USER_STATUS,
        default: "PENDING",
        index: true,
      },
    };

    const schemaOptions = {
      timestamps: true,
      toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
          delete ret.password;
          delete ret.__v;
          return ret;
        },
      },
      toObject: {
        virtuals: true,
        transform: (doc, ret) => {
          delete ret.password;
          delete ret.__v;
          return ret;
        },
      },
    };

    const virtuals = [
      {
        name: "fullName",
        get: function () {
          return [this.profile?.firstName, this.profile?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
        },
      },
    ];

    const methods = {
      comparePassword: async function (candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
      },
      incrementLoginAttempts: async function () {
        this.loginAttempts += 1;
        return this.save();
      },
      resetLoginAttempts: async function () {
        this.loginAttempts = 0;
        return this.save();
      },
    };

    const preHooks = [
      {
        name: "save",
        fn: async function (next) {
          console.log("Pre-save hook triggered for User model");
          if (!this.isModified("password")) return next();

          try {
            this.password = await bcrypt.hash(this.password, 12);
            next();
          } catch (err) {
            next(err);
          }
        },
      },
    ];

    super({
      modelName: "User",
      schemaDefinition: userSchema,
      schemaOptions,
      virtuals,
      preHooks,
      isTenantSpecific: false,
      autoIncrement: false,
      softDelete: true,
      methods
    });

    // Add methods to the schema
    // Object.assign(this.model.schema.methods, methods);
  }

  // ================ CUSTOM USER METHODS ================

  async findByEmail(email,options, tenantId) {
    const selectPassword = options?.selectPassword || false;
    if (selectPassword) {
      return await this.model
        .findOne({ email })
        .select("+password");
    }
    return await this.findOne({ email }, {}, tenantId);
  }

  async verifyUser(userId, tenantId) {
    return await this.updateById(
      userId,
      { isVerified: true, status: "ACTIVE" },
      { new: true },
      tenantId
    );
  }

  async updatePassword(userId, newPassword, tenantId) {
    const user = await this.model.findById(userId)
    if (!user) {
      throw new Error("User not found");
    }

    user.password = newPassword;
    await user.save();
    return user;
  }

  async setResetToken(userId, token, expiresAt, tenantId) {
    return this.updateById(
      userId,
      {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
      },
      { new: true },
      tenantId
    );
  }

  async clearResetToken(userId, tenantId) {
    return this.updateById(
      userId,
      {
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      },
      { new: true },
      tenantId
    );
  }

  async setOtp(userId, otp, expiresAt, tenantId) {
    return this.updateById(
      userId,
      {
        otp,
        otpExpires: expiresAt,
      },
      { new: true },
      tenantId
    );
  }

  async clearOtp(userId, tenantId) {
    return this.updateById(
      userId,
      {
        otp: undefined,
        otpExpires: undefined,
      },
      { new: true },
      tenantId
    );
  }

  async updateLastLogin(userId, tenantId) {
    return this.updateById(
      userId,
      { lastLogin: new Date() },
      { new: true },
      tenantId
    );
  }

  async deactivateUser(userId, tenantId) {
    return this.updateById(
      userId,
      { status: "INACTIVE" },
      { new: true },
      tenantId
    );
  }

  async activateUser(userId, tenantId) {
    return this.updateById(
      userId,
      { status: "ACTIVE" },
      { new: true },
      tenantId
    );
  }

  async suspendUser(userId, tenantId) {
    return this.updateById(
      userId,
      { status: "SUSPENDED" },
      { new: true },
      tenantId
    );
  }
}

// Export the model instance
module.exports = new User();
