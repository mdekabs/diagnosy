import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";
import { responseHandler } from "../utils/index.js";
import HttpStatus from "http-status-codes";
import { logger } from "../config/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Error message constants
const ERR_AUTH_HEADER_MISSING = "You are not authenticated. Please log in to get a new token.";
const ERR_TOKEN_NOT_FOUND = "Token not found.";
const ERR_INVALID_TOKEN = "Invalid token. Please log in again to get a new token.";
const ERR_FORBIDDEN_ACTION = "You are not allowed to perform this task.";

/**
 * Checks if a token is blacklisted in Redis.
 * @param {string} token - The JWT token to check
 * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token) => {
  const blacklisted = await redisClient.get(`blacklist:${token}`);
  return blacklisted === "true";
};

/**
 * Adds a token to the Redis blacklist with an expiration time.
 * @param {string} token - The JWT token to blacklist
 * @param {number} [expiration=3600] - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<void>}
 */
export const updateBlacklist = async (token, expiration = 3600) => {
  await redisClient.set(`blacklist:${token}`, "true", "EX", expiration);
  logger.info(`Token blacklisted for ${expiration}s`);
};

/**
 * Middleware to verify JWT authentication for protected routes.
 */
export const authenticationVerifier = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  logger.info(`Auth header for ${req.method} ${req.originalUrl}: ${token ? "Present" : "Missing"}`);
  if (!token) {
    logger.error(`Authentication failed: No token provided`);
    return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", ERR_AUTH_HEADER_MISSING);
  }

  try {
    if (!redisClient.isOpen) {
      throw new Error("Redis client is not initialized.");
    }

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      logger.error(`Authentication failed: Token is blacklisted`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", ERR_INVALID_TOKEN);
    }

    let user;
    try {
      user = jwt.verify(token, JWT_SECRET);
      logger.info(`Decoded token: ${JSON.stringify(user)}`);
    } catch (jwtError) {
      logger.error(`Token verification failed: ${jwtError.message}`);
      throw new Error(`Invalid token: ${jwtError.message}`);
    }

    if (user.isGuest) {
      logger.error(`Authentication failed: Guest token used for protected route`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", "Guest tokens are not allowed for this route.");
    }

    req.user = user;
    req.userID = user.id; // Set req.userID for ChatController
    logger.info(`Authenticated userID: ${req.userID}`);
    next();
  } catch (err) {
    logger.error(`Authentication failed for ${req.method} ${req.originalUrl}: ${err.message}`);
    return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", ERR_INVALID_TOKEN);
  }
};

/**
 * Optional authentication middleware that allows unauthenticated access.
 */
export const optionalVerifier = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  logger.info(`Optional auth header for ${req.method} ${req.originalUrl}: ${token ? "Present" : "Missing"}`);
  if (!token) {
    req.guestId = null;
    return next();
  }

  try {
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      logger.error(`Optional auth failed: Token is blacklisted`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", ERR_INVALID_TOKEN);
    }

    const user = jwt.verify(token, JWT_SECRET);
    if (!user.isGuest) {
      logger.error(`Optional auth failed: User token used for guest route`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", "User tokens are not allowed for guest routes.");
    }

    const storedToken = await redisClient.get(`guest_${user.guestId}`);
    if (!storedToken) {
      logger.error(`Optional auth failed: Invalid or expired guest token`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, "error", "Invalid or expired guest token.");
    }

    req.guestId = user.guestId;
    logger.info(`Authenticated guestId: ${req.guestId}`);
    next();
  } catch (err) {
    logger.error(`Optional auth failed for ${req.method} ${req.originalUrl}: ${err.message}`);
    req.guestId = null;
    next();
  }
};

/**
 * Creates a permission verification middleware with custom conditions.
 */
export const permissionVerifier = (...conditions) => {
  return (req, res, next) => {
    authenticationVerifier(req, res, () => {
      if (conditions.some((condition) => condition(req.user, req.params.userId))) {
        next();
      } else {
        responseHandler(res, HttpStatus.FORBIDDEN, "error", ERR_FORBIDDEN_ACTION);
      }
    });
  };
};

export const accessLevelVerifier = permissionVerifier(
  (user, userId) => user.id === userId, // User is accessing their own data
  (user) => user.isAdmin // User is an admin
);

export const isAdminVerifier = permissionVerifier((user) => user.isAdmin);
