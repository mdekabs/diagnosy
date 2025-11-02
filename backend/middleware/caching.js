import { RedisConfig, logger } from '../config/index.js';
import { responseHandler } from '../utils/index.js';
import HttpStatus from 'http-status-codes';

export const cacheMiddleware = async (req, res, next) => {
  try {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') return next();

    const userId = req.userID || req.guestId;
    if (!userId) {
      logger.error(`Cache middleware: Missing userID for ${req.method} ${req.originalUrl}`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', 'Authentication required');
    }

    const cacheKey = `cache_${req.originalUrl}_${userId}`;
    const redisClient = RedisConfig.getClient();

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      logger.info(`Cache hit: ${cacheKey}`);
      return res.status(HttpStatus.OK).json(JSON.parse(cachedData));
    }

    logger.info(`Cache miss: ${cacheKey}`);

    // Override res.json to cache GET responses
    const originalJson = res.json;
    res.json = function (data) {
      redisClient
        .set(cacheKey, JSON.stringify(data), 'EX', 3600)
        .then(() => logger.info(`Cached response for ${cacheKey}`))
        .catch(err => logger.error(`Failed to cache response: ${err.message}`));
      return originalJson.call(this, data);
    };

    next();
  } catch (err) {
    logger.error(`Cache middleware error: ${err.message}`);
    next();
  }
};

export const clearCache = async (req, res, next) => {
  try {
    // Only clear on write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

    const userId = req.userID || req.guestId;
    if (!userId) return next();

    const redisClient = RedisConfig.getClient();

    // Find all cache keys for that user
    const userKeys = await redisClient.keys(`cache_*_${userId}`);
    if (userKeys.length > 0) {
      await redisClient.del(userKeys);
      logger.info(`Cleared ${userKeys.length} cache keys for user: ${userId}`);
    }

    next();
  } catch (err) {
    logger.error(`Error clearing cache: ${err.message}`);
    next();
  }
};
