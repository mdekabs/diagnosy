import { createClient } from "redis";
import { LoggerConfig } from "./logger.js";

export class RedisConfig {
  static #logger = LoggerConfig.getLogger();
  static #redisClient = null;

  static initialize() {
    try {
      this.#redisClient = createClient({
        url: process.env.REDIS_URI,
      });
      this.#logger.info("Redis client initialized");
    } catch (error) {
      this.#logger.error(`Redis client initialization error: ${error.message}`);
      throw new Error(`Redis client initialization failed: ${error.message}`);
    }
  }

  static async connect() {
    try {
      if (!this.#redisClient) {
        throw new Error("Redis client not initialized. Call RedisConfig.initialize() first.");
      }
      if (this.#redisClient.isOpen) {
        this.#logger.info("Redis client already connected");
        return;
      }
      await this.#redisClient.connect();
      this.#logger.info("Redis connected");
    } catch (error) {
      this.#logger.error(`Redis connection error: ${error.message}`);
      throw error;
    }
  }

  static async disconnect() {
    try {
      if (!this.#redisClient) {
        throw new Error("Redis client not initialized. Call RedisConfig.initialize() first.");
      }
      if (this.#redisClient.isOpen) {
        await this.#redisClient.quit();
        this.#logger.info("Redis disconnected");
      } else {
        this.#logger.info("Redis client already disconnected");
      }
    } catch (error) {
      this.#logger.error(`Redis disconnection error: ${error.message}`);
      throw error;
    }
  }

  static getClient() {
    if (!this.#redisClient) {
      throw new Error("Redis client not initialized. Call RedisConfig.initialize() first.");
    }
    return this.#redisClient;
  }
}
