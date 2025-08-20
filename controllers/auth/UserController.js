const BaseController = require("../../helpers/BaseController");
const User = require("../../models/User");
const { ApiError } = require("../../utils/apiError");
const crypto = require("crypto");
const config = require("../../config/config");
const jwt = require("jsonwebtoken");
const DateHelper = require("../../helpers/DateHelper");
const { StatusCodes } = require("http-status-codes");
const EmailService = require("../../services/EmailService");
const _enum = require("../../config/enum");

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  /**
   * An API Just created to create the admin and the Developer Accounts taking in the secret 
   */

  signupAdmin = async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = "ADMIN" } = req.body;
      const adminSecret = req.headers["x-admin-secret"] || req.query.key;

      if (!email || !password || !firstName || !lastName) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Email, fullName, and password are required"
        );
      }

      if (!_enum.ROLES.includes(role)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Role is not valid!"
        );
      }

      if (!adminSecret || adminSecret !== config.adminSecretKey) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid admin secret key");
      }

      const existingUser = await this.model.findOne({ email });
      if (existingUser) {
        throw new ApiError(StatusCodes.CONFLICT, "Admin already exists with this email");
      }

      const newAdmin = await this.model.create({
        email,
        password,
        profile: { firstName, lastName },
        role,
        isVerified: true,
        status: "ACTIVE"
      });

      this.sendResponse(res, {
        message: "Admin account created successfully",
        admin: newAdmin,
      });
    } catch (error) {
      console.log("Error in Admin-Signup :", error)
      this.sendError(res, error);
    }
  };


  // ================ AUTHENTICATION METHODS ================
  /**
   * User signup handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  signup = async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password || !firstName || !lastName) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "All fields are required");
      }

      const existingUser = await this.model.findByEmail(email);
      if (existingUser) {
        throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = DateHelper.addToNow(`${config.otpExpiresInMinutes}m`);

      const user = await this.model.create({
        email,
        password,
        profile: { firstName, lastName },
        otp,
        otpExpires,
      });

      try {
        EmailService.sendOtpEmail(email, otp, firstName);
      } catch (emailError) {
        if (config.env === "development") {
          console.error("Failed to send OTP email:", emailError);
        }
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to send OTP email");
      }

      this.sendResponse(
        res,
        {
          message: "User created successfully. Please check your email for verification code.",
          user: user.toJSON(),
        },
        StatusCodes.CREATED
      );
    } catch (error) {
      console.log("Error in signup:", error);
      this.sendError(res, error);
    }
  };

  login = async (req, res) => {
    try {
      const { email, password, keepMeLoggedIn } = req.body;

      if (!email || !password) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Email and password are required"
        );
      }

      const user = await this.model.findByEmail(email, {
        selectPassword: true,
      });

      if (!user) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "Invalid email or password"
        );
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "Invalid email or password"
        );
      }

      const payload = {
        id: user._id,
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.accessTokenExpiresIn,
      });

      const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
        expiresIn: config.refreshTokenExpiresIn,
      });

      this.setAuthCookies(res, accessToken, refreshToken, keepMeLoggedIn);

      const responseData = {
        message: "Login successful",
        user: user.toJSON(),
        accessToken,
      };

      if (keepMeLoggedIn) {
        responseData.refreshToken = refreshToken;
      }

      this.sendResponse(res, responseData);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  logout = async (req, res) => {
    try {
      this.clearAuthCookies(res);
      this.sendResponse(res, { message: "Logout successful" });
    } catch (error) {
      this.sendError(res, error);
    }
  }

  // ================ PASSWORD RESET METHODS ================

  forgetPassword = async (req, res) => {
    try {
      const { email } = req.body;
      console.log("Forget password request for email:", email);

      if (!email) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
      }

      const user = await this.model.findByEmail(email);
      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = DateHelper.addToNow(`${config.otpExpiresInMinutes}m`);

      await this.model.setOtp(user._id, otp, otpExpires);

      try {
        EmailService.sendPasswordResetEmail(email, otp, user.profile.firstName);
      } catch (emailError) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to send password reset email");
      }

      this.sendResponse(res, {
        message: "Password reset OTP sent to your email",
        otpExpires: DateHelper.toCleanISO(otpExpires),
      });
    } catch (error) {
      this.sendError(res, error);
    }
  };

  verifyOtp = async (req, res) => {
    try {
      const { email, otp, event } = req.body;

      if (!email || !otp) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Email and OTP are required"
        );
      }

      const user = await this.model.findByEmail(email);

      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
      }

      if (!user.otp || user.otp !== otp) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid OTP");
      }

      if (DateHelper.isExpired(user.otpExpires)) {
        throw new ApiError(StatusCodes.GONE, "OTP has expired");
      }

      await this.model.verifyUser(user._id);
      await this.model.clearOtp(user._id);

      if (event === "signup") {
        try {
          await EmailService.sendWelcomeEmail(email, user.profile.firstName);
        } catch (emailError) {
          throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to send welcome email");
        }
      }

      this.sendResponse(res, {
        message: "OTP verified successfully. Welcome to SyncMosaic!",
        user: user.toJSON(),
      });
    } catch (error) {
      this.sendError(res, error);
    }
  };

  resendOtp = async (req, res) => {
    try {
      const { email, event = "verify" } = req.body;

      if (!email) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
      }

      const user = await this.model.findByEmail(email, {
        select: "+otp +otpExpires",
      });

      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
      }

      if (user.isVerified && event === "verify") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User is already verified");
      }


      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = DateHelper.addToNow(`${config.otpExpiresInMinutes}m`);

      await this.model.setOtp(user._id, otp, otpExpires);

      try {
        await EmailService.sendOtpEmail(email, otp, user.profile.firstName);
      } catch (emailError) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to send OTP email");
      }

      this.sendResponse(res, {
        message: "OTP resent successfully. Please check your email.",
      });
    } catch (error) {
      this.sendError(res, error);
    }
  };

  resetPassword = async (req, res) => {
    try {
      const { email, newPassword, confirmPassword } = req.body;

      if (!email || !newPassword || !confirmPassword) {
        throw new ApiError({
          message: "Email, newPassword and confirmPassword are required",
          statusCode: StatusCodes.BAD_REQUEST,
        });
      }

      if (newPassword !== confirmPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Passwords do not match");
      }

      const user = await this.model.findByEmail(email);
      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
      }

      if (!user.isVerified) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "User is not verified");
      }

      await this.model.updatePassword(user._id, newPassword);
      await this.model.clearOtp(user._id);

      this.sendResponse(res, { message: "Password reset successfully" });
    } catch (error) {
      this.sendError(res, error);
    }
  };

  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token missing");
      }

      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        config.jwtSecret,
        { expiresIn: config.accessTokenExpiresIn }
      );

      this.setAuthCookies(res, newAccessToken);

      this.sendResponse(res, {
        message: "Token refreshed",
        accessToken: newAccessToken,
      });
    } catch (error) {
      this.sendError(
        res,
        new ApiError("Invalid refresh token", StatusCodes.UNAUTHORIZED)
      );
    }
  };

  // ================ HELPER METHODS ================

  setAuthCookies(res, accessToken, refreshToken, keepMeLoggedIn = false) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    cookieOptions.maxAge = DateHelper.toMs(config.accessTokenExpiresIn);

    res.cookie("accessToken", accessToken, cookieOptions);

    if (keepMeLoggedIn) {
      const refreshCookieOptions = { ...cookieOptions };
      refreshCookieOptions.maxAge = DateHelper.toMs(
        config.refreshTokenExpiresIn
      );
      res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    }
  }

  clearAuthCookies(res) {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }
}

module.exports = new UserController();
