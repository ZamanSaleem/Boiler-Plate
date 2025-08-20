const swaggerJsdoc = require("swagger-jsdoc");
const config = require("../config/config");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Commerce API",
      version: "1.0.0",
      description: "API documentation for the E-Commerce backend",
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: "Development server",
      },
      {
        url: `https://localhost:${config.port}/api/v1`,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./schemas/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
