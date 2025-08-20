const { app } = require("./app");
const config = require("./config/config");
const Database = require("./config/Database");
const SocketService = require("./services/SocketService");
const EmailService = require("./services/EmailService");

const startServer = async () => {
  try {
    await Database.connect(config.mongoUri);
    await EmailService.verifyConnection();

    const server = app.listen(config.port, () => {
      console.log(`Server is running on http://localhost:${config.port}`);
    });

    SocketService.initialize(server);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
