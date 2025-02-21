import { createLogger, transports, format } from "winston";
import expressWinston from "express-winston";
import path from "path";
import fs from "fs";

// Constants for Logger Configuration
const LOG_LEVEL = "info";
const LOG_DIR = path.join(__dirname, "../logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file paths
const APP_LOG_FILE = path.join(LOG_DIR, "app.log");
const ERROR_LOG_FILE = path.join(LOG_DIR, "errors.log");

// Custom log format
const LOG_FORMAT = format.printf(({ level, message, timestamp, meta }) => {
  const statusCode = meta?.res?.statusCode || "";
  return `${timestamp} ${level.toUpperCase()}: ${message} ${statusCode}`;
});

// Setup a Winston Logger
export const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(format.timestamp(), format.json(), LOG_FORMAT),
  transports: [
    new transports.File({ level: LOG_LEVEL, filename: APP_LOG_FILE }),
    new transports.File({ level: "error", filename: ERROR_LOG_FILE, handleExceptions: true }),
  ],
});

// Enable console logging in non-production environments
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      handleExceptions: true,
    })
  );
}

// Express Request Logger
export const appLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  statusLevels: true,
  colorize: false,
  expressFormat: true,
  requestWhitelist: ["method", "url", "headers", "query", "body"],
  responseWhitelist: ["statusCode", "body"],
});

// Express Error Logger
export const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
});
