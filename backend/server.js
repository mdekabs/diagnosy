import { httpServer } from "./app.js";
import { DatabaseConfig, RedisConfig, logger } from "./config/index.js";
import gracefulShutdown from "express-graceful-shutdown";

const PORT = process.env.PORT || 3000;

const start = async () => {
    let serverInstance;

    try {
        serverInstance = httpServer.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info("chat with AI at base_url/chat.html");
        });

        gracefulShutdown(serverInstance, {
            timeout: 30000,
            logger: logger.info.bind(logger),
        });
        
    } catch (error) {
        logger.error(`Server startup error: ${error.message}`);
        process.exit(1);
    }
};

const shutdown = async (signal) => {
    try {
        logger.info(`Received ${signal}. Initiating graceful shutdown...`);

        await DatabaseConfig.disconnect();
        await RedisConfig.disconnect();
        logger.info("Graceful shutdown completed.");
        process.exit(0);
    } catch (error) {
        logger.error(`Shutdown error: ${error.message}`);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
