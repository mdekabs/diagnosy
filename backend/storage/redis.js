import { createClient } from "redis";

/**
 * Class representing the Redis Client.
 */
class RedisClient {
  /**
   * Creates an instance of the RedisClient.
   * Establishes a connection to the Redis server.
   */
  constructor() {
    this.client = createClient();

    this.alive = false; // Default to false until connected

    this.client.on("error", (error) => {
      console.error("Redis Error:", error);
      this.alive = false;
    });

    this.client.on("connect", () => {
      console.log("Redis connected");
      this.alive = true;
    });

    this.client.on("end", () => {
      console.log("Redis connection closed");
      this.alive = false;
    });

    this.connect();
  }

  /**
   * Establishes a connection to the Redis server.
   */
  async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      console.error("Redis connection failed:", error);
    }
  }

  /**
   * Checks if the Redis server connection is alive.
   * @returns {boolean} - The status of the Redis server connection.
   */
  isAlive() {
    return this.alive;
  }

  /**
   * Retrieves the value associated with a key from Redis.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<string | null>} - The value associated with the key or null if not found.
   */
  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error("Redis GET Error:", error);
      return null;
    }
  }

  /**
   * Sets the value associated with a key in Redis with expiration.
   * @param {string} key - The key to set.
   * @param {string} value - The value to associate with the key.
   * @param {number} duration - The expiration time for the key in seconds.
   */
  async set(key, value, duration) {
    try {
      await this.client.setEx(key, duration, value);
    } catch (error) {
      console.error("Redis SET Error:", error);
    }
  }

  /**
   * Deletes a key and its associated value from Redis.
   * @param {string} key - The key to delete.
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error("Redis DEL Error:", error);
    }
  }
}

/**
 * Creates a singleton instance of the RedisClient.
 */
const redisClient = new RedisClient();

export default redisClient;
