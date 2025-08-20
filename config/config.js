require("dotenv").config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/syncmosaic",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  mailHost: process.env.MAIL_HOST || "smtp.example.com",
  mailPort: parseInt(process.env.MAIL_PORT || "587", 10),
  mailUser: process.env.MAIL_USER || "user@example.com",
  mailPass: process.env.MAIL_PASS || "password",
  mailFrom: process.env.MAIL_FROM || "noreply@example.com",
  apiUrl: process.env.API_URL || "http://localhost:5000",
  adminUrl: process.env.ADMIN_URL || "http://localhost:5173",
  siteUrl: process.env.SITE_URL || "http://localhost:3000",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
  adminSecretKey: process.env.SUPER_ADMIN_SECRET || "default-admin-secret",
  otpExpiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES || "10", 10),
};

module.exports = config;
