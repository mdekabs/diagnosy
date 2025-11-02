import jwt from 'jsonwebtoken';
import { RedisConfig, logger } from '../config/index.js';
import { responseHandler } from '../utils/index.js';
import HttpStatus from 'http-status-codes';
import User from '../models/user.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Error message constants
const ERR_AUTH_HEADER_MISSING = 'You are not authenticated. Please log in to get a new token.';
const ERR_INVALID_TOKEN = 'Invalid token. Please log in again to get a new token.';
const ERR_INVALID_GUEST_ID = 'Invalid or expired guest ID.';
const ERR_FORBIDDEN_ACTION = 'You are not allowed to perform this task.';
const ERR_MISSING_USER_ID = 'Invalid token: Missing user ID';

// --- Redis Helpers ---

/**
 * Checks if a token is blacklisted in Redis.
 * @param {string} token - The raw JWT token string.
 * @returns {Promise<boolean>} True if blacklisted, false otherwise.
 */
export const isTokenBlacklisted = async (token) => {
    const redisClient = RedisConfig.getClient();
    const blacklisted = await redisClient.get(`blacklist:${token}`);
    return blacklisted === 'true';
};

/**
 * Adds a token to the Redis blacklist with an expiration time.
 * @param {string} token - The raw JWT token string.
 * @param {number} expiration - Expiration time in seconds.
 */
export const updateBlacklist = async (token, expiration = 3600) => {
    const redisClient = RedisConfig.getClient();
    await redisClient.set(`blacklist:${token}`, 'true', 'EX', expiration);
    logger.info(`Token blacklisted for ${expiration}s`);
};

// --- Database User Check (Formerly checkActiveUserStatus) ---

/**
 * Checks MongoDB to ensure the user ID provided in the token still exists.
 * This is the crucial step for preventing stale token use (deleted users).
 * @param {string} userID - The ID extracted from the authenticated JWT.
 * @throws {Error} If the user document is not found.
 */
const checkActiveUserExistence = async (userID) => {
    // Check for existence without loading unnecessary data
    const user = await User.findById(userID).select('_id');
    
    if (!user) {
        logger.error(`Security violation: User ID ${userID} found in a valid token but does not exist in DB.`);
        throw new Error('Invalid token: User account not found or has been deleted.');
    }
    // If user exists, do nothing (success)
};

// ----------------------------------------------------------------------
// CORE REUSABLE FUNCTION FOR JWT AUTHENTICATION (ALL SECURITY CHECKS)
// ----------------------------------------------------------------------

/**
 * Performs full token validation, blacklist check, decoding, and user existence check.
 * This function is the single source of truth for authentication security.
 * @param {string} token - The raw JWT token string.
 * @returns {Promise<object>} The decoded user payload (with 'id').
 * @throws {Error} If any security check fails (invalid, blacklisted, or deleted user).
 */
export const verifyTokenCore = async (token) => {
    const redisClient = RedisConfig.getClient();
    if (!redisClient.isOpen) {
        throw new Error('Redis client is not initialized.');
    }

    // 1. Check Redis Blacklist Status
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
        logger.error(`Token is blacklisted`);
        throw new Error(ERR_INVALID_TOKEN);
    }

    // 2. Signature, Expiration, and Decoding check
    let user;
    try {
        user = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
        logger.error(`Token verification failed: ${jwtError.message}`);
        throw new Error(ERR_INVALID_TOKEN);
    }

    // 3. Payload Check
    if (!user.id) {
        logger.error('Token payload missing user.id');
        throw new Error(ERR_MISSING_USER_ID);
    }
    
    // 4. CRITICAL: USER EXISTENCE CHECK (Stale Token Prevention)
    await checkActiveUserExistence(user.id);

    logger.info(`Token successfully verified for active userID: ${user.id}`);
    return user;
};


// ----------------------------------------------------------------------
// HTTP MIDDLEWARE (Wrapper around Core)
// ----------------------------------------------------------------------

/**
 * Middleware to verify JWT authentication for protected routes.
 * Uses verifyTokenCore to perform all necessary security checks.
 */
export const authenticationVerifier = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    logger.info(`Auth header for ${req.method} ${req.originalUrl}: ${authHeader ? 'Present' : 'Masked'}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.error(`Authentication failed: Invalid or missing Authorization header`);
        return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', ERR_AUTH_HEADER_MISSING);
    }

    const token = authHeader.replace('Bearer ', '');
    try {
        // Core function runs all security checks (token, blacklist, user existence)
        const user = await verifyTokenCore(token);

        // Attach user info to request object
        req.user = user;
        req.userID = user.id;
        logger.info(`Authenticated userID: ${req.userID} for ${req.method} ${req.originalUrl}`);
        next();
    } catch (err) {
        logger.error(`Authentication failed for ${req.method} ${req.originalUrl}: ${err.message}`);
        // Return 401 for all authentication failures
        return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', err.message);
    }
};

/**
 * Optional authentication middleware for guest routes.
 */
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
        const redisClient = RedisConfig.getClient();
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

