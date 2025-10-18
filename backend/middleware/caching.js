import { RedisConfig, logger } from '../config/index.js';
import { responseHandler } from '../utils/index.js';
import HttpStatus from 'http-status-codes';

export const cacheMiddleware = async (req, res, next) => {
  try {
    const userId = req.userID || req.guestId;
    if (!userId && req.method === 'GET') {
      logger.error(`Cache middleware: Missing userID for ${req.method} ${req.originalUrl}`);
      return responseHandler(res, HttpStatus.UNAUTHORIZED, 'error', 'Authentication required for cached route');
    }

    const cacheKey = `cache_${req.method}_${req.originalUrl}_${userId || 'anonymous'}`;
    logger.info(`Cache key for ${req.method} ${req.originalUrl}: ${cacheKey}`);
    
    const redisClient = RedisConfig.getClient();
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      logger.info(`Cache hit for key: ${cacheKey}`);
      return res.status(HttpStatus.OK).json(JSON.parse(cachedData));
    }
    
    logger.info(`Cache miss for key: ${cacheKey}`);
    res.locals.cacheKey = cacheKey;
    
    // Override res.json to cache GET responses only
    const originalJson = res.json;
    res.json = function (data) {
      if (req.method === 'GET' && !res.headersSent) {
        redisClient.set(cacheKey, JSON.stringify(data), 'EX', 3600)
          .then(() => logger.info(`Cached response for key: ${cacheKey}`))
          .catch(err => logger.error(`Failed to cache response for ${cacheKey}: ${err.message}`));
      }
      return originalJson.call(this, data);
    };
    
    next();
  } catch (err) {
    logger.error(`Cache middleware error for ${req.method} ${req.originalUrl}: ${err.message}`);
    next();
  }
};

// Clear cache after mutations
export const clearCache = async (req, res, next) => {
  const userId = req.userID || req.guestId;
  if (userId) {
    // Clear both POST and GET /api/chat/history caches
    const cacheKeys = [
      `cache_${req.method}_${req.originalUrl}_${userId}`,
      `cache_GET_/api/chat/history_${userId}`
    ];
    try {
      const redisClient = RedisConfig.getClient();
      await redisClient.del(cacheKeys);
      logger.info(`Cache cleared for keys: ${cacheKeys.join(', ')}`);
    } catch (err) {
      logger.error(`Clear cache error for ${cacheKeys.join(', ')}: ${err.message}`);
    }
  }
  next();
};

// Clean invalid guest_chat:null keys
export const cleanInvalidCache = async () => {
  try {
    const redisClient = RedisConfig.getClient();
    const keys = await redisClient.keys('guest_chat:null');
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleaned ${keys.length} invalid guest_chat:null keys`);
    }
  } catch (err) {
    logger.error(`Error cleaning invalid cache keys: ${err.message}`);
  }
};
