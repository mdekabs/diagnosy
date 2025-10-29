// server.js
import { httpServer } from "./app.js"; // 👈 Import the httpServer (now exported from app.js)
import { DatabaseConfig, RedisConfig, logger } from "./config/index.js";
import gracefulShutdown from "express-graceful-shutdown";

const PORT = process.env.PORT || 3000;

const start = async () => {
    let serverInstance;

    try {
        // 1. Start the combined HTTP/WebSocket server
        serverInstance = httpServer.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });

        // 2. Attach gracefulShutdown directly to the server instance (it's a function, not middleware here)
        gracefulShutdown(serverInstance, {
            timeout: 30000,
            logger: logger.info.bind(logger),
        });
        
    } catch (error) {
        logger.error(`Server startup error: ${error.message}`);
        process.exit(1);
    }
};

// --- (Shutdown logic remains clean and correct) ---
const shutdown = async (signal) => {
    try {
        logger.info(`Received ${signal}. Initiating graceful shutdown...`);

        // Disconnect logic
        await DatabaseConfig.disconnect();
        logger.info("MongoDB disconnected");

        await RedisConfig.disconnect();
        logger.info("Redis disconnected");

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
