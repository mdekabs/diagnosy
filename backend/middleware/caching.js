import redisClient from "../config/redis.js";
import { responseHandler } from "../utils/index.js";
import HttpStatus from "http-status-codes";
import { logger } from "../config/logger.js";

export const cacheMiddleware = async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  const key = req.originalUrl;
  const TTL = 300;

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);

      if (parsedData.type === "error") {
        await redisClient.del(key);
        logger.info(`Removed invalid cached error for key: ${key}`);
      } else {
        logger.info(`Serving cached response for key: ${key}`);
        return res.json(parsedData);
      }
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisClient.set(key, JSON.stringify(body), "EX", TTL);
        logger.info(`Cached response for key: ${key}`);
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error(`Cache Error: ${error.message}`);
    return responseHandler(res, HttpStatus.INTERNAL_SERVER_ERROR, "error", "Cache error");
  }
};

export const clearCache = async (req, res, next) => {
  try {
    const key = req.originalUrl || req.path;
    logger.info(`Attempting to clear cache for key: ${key}`);

    if (!key || typeof key !== "string") {
      logger.error(`Invalid cache key derived from request: ${key}`);
      return next();
    }

    await redisClient.del(key);
    logger.info(`Cleared cache for key: ${key}`);

    const wildcardKey = key.includes("/") ? key.split("/")[1] : key;
    const keysToDelete = await redisClient.keys(`*${wildcardKey}*`);

    if (keysToDelete.length) {
      await redisClient.del(...keysToDelete);
      logger.info(`Cleared related cache keys: ${keysToDelete.join(", ")}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache: ${error.message}`);
  }
  next();
};
