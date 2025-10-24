import express from "express";
import { env, logger, appLogger, errorLogger, DatabaseConfig, RedisConfig, SwaggerConfig } from "./config/index.js";
//import routes from "./routes/index.js";
import from "./routes/index.js";
import { errorMiddleware } from "./middleware/error_middleware.js";

const app = express();

// Initialize configurations
logger.info(`Starting application in ${env} environment`);
await DatabaseConfig.connect();
RedisConfig.initialize(); // Required before RedisConfig.connect()
await RedisConfig.connect();
SwaggerConfig.setup(app);

// Global Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use(appLogger);

// API Routes
app.use("/api", routes);

// Error Handling Middlewares
app.use(errorLogger);
app.use(errorMiddleware);

// Log server startup
logger.info("Express server initialized");

export default app;
