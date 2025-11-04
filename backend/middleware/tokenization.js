import jwt from 'jsonwebtoken';
import { RedisConfig, logger } from '../config/index.js';
import { responseHandler } from '../utils/index.js';
import HttpStatus from 'http-status-codes';
import User from '../models/user.js';

const JWT_SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────
// Error Message Constants
// ─────────────────────────────────────────────
const ERRORS = {
  AUTH_HEADER_MISSING: 'You are not authenticated. Please log in to get a new token.',
  INVALID_TOKEN: 'Invalid token. Please log in again to get a new token.',
  INVALID_GUEST_ID: 'Invalid or expired guest ID.',
  FORBIDDEN_ACTION: 'You are not allowed to perform this task.',
  MISSING_USER_ID: 'Invalid token: Missing user ID.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.'
};

// ─────────────────────────────────────────────
// Redis Token Blacklist Helpers
// ─────────────────────────────────────────────

/**
 * Check if a token is blacklisted in Redis.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export const isTokenBlacklisted = async (token) => {
  const redisClient = RedisConfig.getClient();
  const result = await redisClient.get(`blacklist:${token}`);
  return result === 'true';
};

/**
 * Add a token to the Redis blacklist with an expiration time.
 * @param {string} token
 * @param {number} expiration (seconds)
 */
export const updateBlacklist = async (token, expiration = 3600) => {
  const redisClient = RedisConfig.getClient();
  await redisClient.set(`blacklist:${token}`, 'true', 'EX', expiration);
  logger.info(`Token blacklisted for ${expiration}s`);
};

// ─────────────────────────────────────────────
// User Session Validation Helpers
// ─────────────────────────────────────────────

/**
 * Fetch the user's latest login timestamp for session validation.
 * @param {string} userID
 * @returns {Promise<Date>}
 */
const getLatestLoginTimestamp = async (userID) => {
  const user = await User.findById(userID).select('lastLogin');
  if (!user) {
    logger.error(`User ${userID} found in token but not in database.`);
    throw new Error('Invalid token: User not found or deleted.');
  }

  if (!user.lastLogin || !(user.lastLogin instanceof Date)) {
    logger.error(`User ${userID} has invalid lastLogin field.`);
    throw new Error('Internal validation error.');
  }

  return user.lastLogin;
};

// ─────────────────────────────────────────────
// Core Token Verification Logic
// ─────────────────────────────────────────────

/**
 * Validate JWT, check blacklist status, and confirm active session.
 * @param {string} token
 * @returns {Promise<object>} Decoded user payload
 */
export const verifyTokenCore = async (token) => {
  const redisClient = RedisConfig.getClient();
  if (!redisClient.isOpen) throw new Error('Redis client not initialized.');

  // 1. Check if token is blacklisted
  if (await isTokenBlacklisted(token)) {
    logger.error('Attempted use of blacklisted token.');
    throw new Error(ERRORS.INVALID_TOKEN);
  }

  // 2. Verify token signature & decode payload
  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    logger.error(`Token verification failed: ${err.message}`);
    throw new Error(ERRORS.INVALID_TOKEN);
  }

  // 3. Validate token payload
  if (!user.id) {
    logger.error('Token payload missing user.id');
    throw new Error(ERRORS.MISSING_USER_ID);
  }

  const tokenSessionTime = user.iat_session;
  if (typeof tokenSessionTime !== 'number') {
    logger.error(`Missing iat_session for user ${user.id}`);
    throw new Error(ERRORS.INVALID_TOKEN);
  }

  // 4. Validate against latest DB session
  const dbLastLogin = await getLatestLoginTimestamp(user.id);
  if (tokenSessionTime !== dbLastLogin.getTime()) {
    logger.error(
      `Stale token: userID ${user.id} | TokenTime ${tokenSessionTime} | DBTime ${dbLastLogin.getTime()}`
    );
    throw new Error(ERRORS.SESSION_EXPIRED);
  }

  logger.info(`Valid token for active user ${user.id}`);
  return user;
};

// ─────────────────────────────────────────────
// Middleware: Authentication & Permissions
// ─────────────────────────────────────────────

/**
 * Verify JWT for protected routes.
 */
export const authenticationVerifier = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const route = `${req.method} ${req.originalUrl}`;
  logger.info(`Auth check for ${route}: ${authHeader ? 'Header found' : 'Header missing'}`);

  if (!authHeader?.startsWith('Bearer ')) {
    logger.error(`Auth failed: Missing or invalid header on ${route}`);
    return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERRORS.AUTH_HEADER_MISSING);
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const user = await verifyTokenCore(token);
    req.user = user;
    req.userID = user.id;
    logger.info(`User ${user.id} authenticated for ${route}`);
    next();
  } catch (err) {
    logger.error(`Auth error on ${route}: ${err.message}`);
    return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', err.message);
  }
};

/**
 * Optional authentication for guest routes.
 */
export const optionalVerifier = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const route = `${req.method} ${req.originalUrl}`;
  logger.info(`Optional auth check for ${route}: ${authHeader ? 'Header found' : 'Missing'}`);

  if (!authHeader?.startsWith('Bearer ')) {
    req.guestId = null;
    return next();
  }

  const guestId = authHeader.replace('Bearer ', '');
  try {
    const redisClient = RedisConfig.getClient();
    if (!redisClient.isOpen) throw new Error('Redis client not initialized.');

    const status = await redisClient.get(`guest_${guestId}`);
    if (!status) {
      logger.error(`Invalid or expired guest ID: ${guestId}`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERRORS.INVALID_GUEST_ID);
    }

    req.guestId = guestId;
    logger.info(`Guest authenticated: ${guestId}`);
    next();
  } catch (err) {
    logger.error(`Guest auth failed: ${err.message}`);
    req.guestId = null;
    return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERRORS.INVALID_GUEST_ID);
  }
};

/**
 * Restricts access based on conditions (used for role or ownership checks).
 */
export const permissionVerifier = (...conditions) => {
  return (req, res, next) => {
    authenticationVerifier(req, res, () => {
      const allowed = conditions.some((condition) => condition(req.user, req.params.userId));
      if (allowed) return next();
      responseHandler(res, HttpStatus.FORBIDDEN, 'error', ERRORS.FORBIDDEN_ACTION);
    });
  };
};

// ─────────────────────────────────────────────
// Role-Based Middleware
// ─────────────────────────────────────────────

export const accessLevelVerifier = permissionVerifier(
  (user, userId) => user.id === userId,
  (user) => user.isAdmin
);

export const isAdminVerifier = permissionVerifier((user) => user.isAdmin);
