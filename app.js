const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const config = require("./config/config");
const { errorHandler } = require("./middlewares/errorHandler");
const { notFoundHandler } = require("./middlewares/notFoundHandler");
const { connectApis } = require("./routes");
const swaggerUi = require("swagger-ui-express");
const { swaggerSpec } = require("./docs/swagger");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(hpp());

// Security middleware
app.use(helmet());

const allowedOrigins = [
  config.siteUrl,
  config.adminUrl,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const msg = `The CORS policy for this site does not allow access from ${origin}`;
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Request-Headers",
      "Access-Control-Allow-Origin",
    ],
    exposedHeaders: ["Content-Length", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 10 requests per windowMs
});
app.use("/api", limiter);

// Logger
if (config.env === "development") {
  app.use(morgan("dev"));
}

// Routes
connectApis(app);

if (config.env === "development") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Error handling
app.use(notFoundHandler);

app.use(errorHandler);

module.exports = { app };
