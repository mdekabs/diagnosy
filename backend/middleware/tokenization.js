import jwt from 'jsonwebtoken';
import redisClient from '../config/redis.js';
import { responseHandler } from '../utils/index.js';
import HttpStatus from 'http-status-codes';
import { logger } from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Error message constants
const ERR_AUTH_HEADER_MISSING = 'You are not authenticated. Please log in to get a new token.';
const ERR_INVALID_TOKEN = 'Invalid token. Please log in again to get a new token.';
const ERR_INVALID_GUEST_ID = 'Invalid or expired guest ID.';
const ERR_FORBIDDEN_ACTION = 'You are not allowed to perform this task.';

// Checks if a token is blacklisted in Redis
export const isTokenBlacklisted = async (token) => {
  const blacklisted = await redisClient.get(`blacklist:${token}`);
  return blacklisted === 'true';
};

// Adds a token to the Redis blacklist with an expiration time
export const updateBlacklist = async (token, expiration = 3600) => {
  await redisClient.set(`blacklist:${token}`, 'true', 'EX', expiration);
  logger.info(`Token blacklisted for ${expiration}s`);
};

// Middleware to verify JWT authentication for protected routes
export const authenticationVerifier = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  logger.info(`Auth header for ${req.method} ${req.originalUrl}: ${authHeader ? 'Present' : 'Masked'}`);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.error(`Authentication failed: Invalid or missing Authorization header`);
    return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERR_AUTH_HEADER_MISSING);
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    if (!redisClient.isOpen) {
      throw new Error('Redis client is not initialized.');
    }

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      logger.error(`Authentication failed: Token is blacklisted`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERR_INVALID_TOKEN);
    }

    let user;
    try {
      if (!jwt) {
        logger.error('jsonwebtoken module is not defined');
        throw new Error('Internal server error: JWT module unavailable');
      }
      user = jwt.verify(token, JWT_SECRET);
      logger.info(`Decoded token: ${JSON.stringify(user)}`);
    } catch (jwtError) {
      logger.error(`Token verification failed: ${jwtError.message}`);
      throw new Error(`Invalid token: ${jwtError.message}`);
    }

    if (!user.id) {
      logger.error('Authentication failed: user.id not found in token payload');
      return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', 'Invalid token: Missing user ID');
    }

    req.user = user;
    req.userID = user.id;
    logger.info(`Authenticated userID: ${req.userID} for ${req.method} ${req.originalUrl}`);
    next();
  } catch (err) {
    logger.error(`Authentication failed for ${req.method} ${req.originalUrl}: ${err.message}`);
    return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERR_INVALID_TOKEN);
  }
};

// Optional authentication middleware for guest routes
export const optionalVerifier = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  logger.info(`Optional auth header for ${req.method} ${req.originalUrl}: ${authHeader ? 'Present' : 'Missing'}`);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.guestId = null;
    logger.info(`No guest ID provided, proceeding as unauthenticated for ${req.method} ${req.originalUrl}`);
    return next();
  }

  const guestId = authHeader.replace('Bearer ', '');
  try {
    if (!redisClient.isOpen) {
      throw new Error('Redis client is not initialized.');
    }

    const status = await redisClient.get(`guest_${guestId}`);
    if (!status) {
      logger.error(`Optional auth failed: Invalid or expired guest ID: ${guestId}`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERR_INVALID_GUEST_ID);
    }

    req.guestId = guestId;
    logger.info(`Authenticated guestId: ${req.guestId} for ${req.method} ${req.originalUrl}`);
    next();
  } catch (err) {
    logger.error(`Optional auth failed for ${req.method} ${req.originalUrl}: ${err.message}`);
    req.guestId = null;
    return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERR_INVALID_GUEST_ID);
  }
};

// Permission verification middleware
export const permissionVerifier = (...conditions) => {
  return (req, res, next) => {
    authenticationVerifier(req, res, () => {
      if (conditions.some((condition) => condition(req.user, req.params.userId))) {
        next();
      } else {
        responseHandler(res, HttpStatus.FORBIDDEN, 'error', ERR_FORBIDDEN_ACTION);
      }
    });
  };
};

export const accessLevelVerifier = permissionVerifier(
  (user, userId) => user.id === userId,
  (user) => user.isAdmin
);

export const isAdminVerifier = permissionVerifier((user) => user.isAdmin);
