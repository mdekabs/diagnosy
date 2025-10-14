import Queue from "bull";
import { logger } from "../../config/logger.js";

const emailQueue = new Queue("emailQueue", {
  redis: {
    uri: process.env.REDIS_URI
  },
});

emailQueue.on("ready", () => {
  logger.info("Email queue connected to Redis");
});

emailQueue.on("error", (error) => {
  logger.error(`Email queue error: ${error.message}`);
});

export { emailQueue };
