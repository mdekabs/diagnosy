import { createClient } from 'redis';
import { logger } from './logger.js';

// --- Constants ---
const REDIS_URI = process.env.REDIS_URI ?? '';
const ERRORS = {
  NOT_INITIALIZED: 'Redis client not initialized. Call RedisConfig.initialize() first.',
  INITIALIZE_FAILED: (msg) => `Redis client initialization failed: ${msg}`,
  CONNECT_FAILED: (msg) => `Redis connection error: ${msg}`,
  DISCONNECT_FAILED: (msg) => `Redis disconnection error: ${msg}`,
};

let redisClient = null;

/**
 * RedisConfig
 * @description Manages Redis client initialization, connection, disconnection, and access.
 */
export const RedisConfig = {
  /**
   * Initializes the Redis client
   * @returns {void}
   * @throws {Error} If initialization fails
   */
  initialize: () => {
    try {
      if (!REDIS_URI) throw new Error('Redis URI is missing');
      redisClient = createClient({ url: REDIS_URI });
      logger.info('Redis client initialized');
    } catch (error) {
      logger.error(ERRORS.INITIALIZE_FAILED(error.message));
      throw new Error(ERRORS.INITIALIZE_FAILED(error.message));
    }
  },

  /**
   * Connects to Redis
   * @async
   * @returns {Promise<void>} Resolves when connected or already connected
   * @throws {Error} If client is not initialized or connection fails
   */
  connect: async () => {
    try {
      if (!redisClient) throw new Error(ERRORS.NOT_INITIALIZED);
      if (redisClient.isOpen) {
        logger.info('Redis client already connected');
        return;
      }
      await redisClient.connect();
      logger.info('Redis connected');
    } catch (error) {
      logger.error(ERRORS.CONNECT_FAILED(error.message));
      throw new Error(ERRORS.CONNECT_FAILED(error.message));
    }
  },

  /**
   * Disconnects from Redis
   * @async
   * @returns {Promise<void>} Resolves when disconnected or already disconnected
   * @throws {Error} If client is not initialized or disconnection fails
   */
  disconnect: async () => {
    try {
      if (!redisClient) throw new Error(ERRORS.NOT_INITIALIZED);
      if (redisClient.isOpen) {
        await redisClient.quit();
        logger.info('Redis disconnected');
      } else {
        logger.info('Redis client already disconnected');
      }
    } catch (error) {
      logger.error(ERRORS.DISCONNECT_FAILED(error.message));
      throw new Error(ERRORS.DISCONNECT_FAILED(error.message));
    }
  },

  /**
   * Retrieves the Redis client instance
   * @returns {Object} Redis client instance
   * @throws {Error} If client is not initialized
   */
  getClient: () => {
    if (!redisClient) throw new Error(ERRORS.NOT_INITIALIZED);
    return redisClient;
  },
};

export default RedisConfig;
