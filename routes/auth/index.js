const express = require("express");
const router = express.Router();
const UserController = require("../../controllers/auth/UserController");

router.post("/signup", UserController.signup)
router.post("/login", UserController.login)
router.post("/logout", UserController.logout)
router.post("/forgot-password", UserController.forgetPassword)
router.post("/reset-password", UserController.resetPassword)
router.post("/verify-otp", UserController.verifyOtp)
router.post("/resend-otp", UserController.resendOtp)
router.post("/refresh-token", UserController.refreshToken)

router.post("/adminsignup", UserController.signupAdmin)

module.exports = router;