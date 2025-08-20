const authRoutes = require("./auth");
const v1Routes = require("./v1");

const connectApis = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/v1", v1Routes);
};

module.exports = { connectApis };
