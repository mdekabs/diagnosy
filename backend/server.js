import app from "./app.js";
import { DatabaseConfig, RedisConfig, logger } from "./config/index.js";
import gracefulShutdown from "express-graceful-shutdown";

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    app.use(
      gracefulShutdown(server, {
        timeout: 30000,
        logger: logger.info.bind(logger),
      })
    );
  } catch (error) {
    const logger = LoggerConfig.getLogger();
    logger.error(`Server startup error: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  try {
    const logger = LoggerConfig.getLogger();
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    await DatabaseConfig.disconnect();
    logger.info("MongoDB disconnected");

    await RedisConfig.disconnect();
    logger.info("Redis disconnected");

    logger.info("Graceful shutdown completed.");
    process.exit(0);
  } catch (error) {
    const logger = LoggerConfig.getLogger();
    logger.error(`Shutdown error: ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
