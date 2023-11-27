// logger.middleware.js
import { createWriteStream, readFileSync } from 'fs';
import { join, dirname } from 'path';
import express from 'express';

const moduleURL = new URL(import.meta.url);
const moduleDir = dirname(moduleURL.pathname);

/**
 * Create a writable stream to log requests and responses to a file.
 * @type {import('fs').WriteStream}
 */
export const logStream = createWriteStream(join(moduleDir, 'access.log'), { flags: 'a' });

/**
 * Middleware that logs each incoming request to a file.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
const loggerMiddleware = (req, res, next) => {
  /**
   * Formatted timestamp for the log entry.
   * @type {string}
   */
  const formattedTimestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

  /**
   * Log entry string.
   * @type {string}
   */
  const logEntry = `${formattedTimestamp} - ${req.method} ${req.url}`;
  logStream.write(logEntry + '\n');
  next();
};

/**
 * Express route for getting log content.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
const getLogsRoute = (req, res) => {
  try {
    /**
     * Log content read from the log file.
     * @type {string}
     */
    const logContent = readFileSync(join(moduleDir, 'access.log'), 'utf8');
    res.status(200).send(logContent);
  } catch (error) {
    console.error('Error reading log file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Express router for logs route.
 * @type {import('express').Router}
 */
export const logsRouter = express.Router();
logsRouter.get('/logs', getLogsRoute);

export default loggerMiddleware;
