import express from "express";
import { EnvConfig, logger, DatabaseConfig, RedisConfig, SwaggerConfig } from "./config/index.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/error_middleware.js";

const app = express();

// Initialize configurations
EnvConfig.initialize();
LoggerConfig.initialize();
await DatabaseConfig.connect();
await RedisConfig.connect();
SwaggerConfig.setup(app);

// Global Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use(LoggerConfig.getAppLogger());

// API Routes
app.use("/api", routes);

// Error Handling Middlewares
app.use(LoggerConfig.getErrorLogger());
app.use(errorMiddleware);

// Log server startup
LoggerConfig.getLogger().info("Express server initialized");

export default app;
