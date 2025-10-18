import fs from 'fs';
import { createLogger, transports, format } from 'winston';
import expressWinston from 'express-winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export class LoggerConfig {
  static #LOG_DIR = 'v1/logs';
  static #LOG_LEVEL = 'info';
  static #customTimestamp = format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss A' });

  // Winston logger instance
  static #logger = null;

  // Custom log format that filters sensitive data and pretty-prints metadata
  static #prettyPrintFormat = format.printf(({ level, message, timestamp, meta }) => {
    if (meta?.req?.headers?.authorization) delete meta.req.headers.authorization;
    const metaString = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level.toUpperCase()}: ${message} ${metaString}`;
  });

  static initialize() {
    try {
      // Ensure log directory exists, creating it if necessary
      if (!fs.existsSync(this.#LOG_DIR)) {
        fs.mkdirSync(this.#LOG_DIR, { recursive: true });
      }

      // Initialize Winston logger
      this.#logger = createLogger({
        level: this.#LOG_LEVEL,
        format: format.combine(this.#customTimestamp, this.#prettyPrintFormat),
        transports: [
          // General application logs
          new DailyRotateFile({
            filename: `${this.#LOG_DIR}/app-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: this.#LOG_LEVEL,
          }),
          // Error-specific logs
          new DailyRotateFile({
            filename: `${this.#LOG_DIR}/errors-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            handleExceptions: true,
          }),
          // Debug-level logs
          new DailyRotateFile({
            filename: `${this.#LOG_DIR}/debug-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'debug',
          }),
        ],
        exceptionHandlers: [
          new transports.File({ filename: `${this.#LOG_DIR}/exceptions.log` }),
        ],
      });

      // Add console transport in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        this.#logger.add(
          new transports.Console({
            format: format.combine(format.colorize(), this.#customTimestamp, this.#prettyPrintFormat),
            handleExceptions: true,
          })
        );
      }

      // Set up global handler for unhandled promise rejections
      process.on('unhandledRejection', (reason) => {
        this.#logger.error(`Unhandled Rejection: ${reason}`);
      });

      this.#logger.info(`Logger initialized for ${process.env.NODE_ENV || 'development'} environment`);
    } catch (error) {
      console.error(`Failed to initialize logger: ${error.message}`);
      throw new Error(`Logger initialization failed: ${error.message}`);
    }
  }

  static getLogger() {
    if (!this.#logger) {
      throw new Error('Logger not initialized. Call LoggerConfig.initialize() first.');
    }
    return this.#logger;
  }

  static getAppLogger() {
    if (!this.#logger) {
      throw new Error('Logger not initialized. Call LoggerConfig.initialize() first.');
    }
    return expressWinston.logger({
      winstonInstance: this.#logger,
      meta: true,
      statusLevels: true,
      expressFormat: true,
      colorize: false,
    });
  }

  static getErrorLogger() {
    if (!this.#logger) {
      throw new Error('Logger not initialized. Call LoggerConfig.initialize() first.');
    }
    return expressWinston.errorLogger({ winstonInstance: this.#logger });
  }
}
