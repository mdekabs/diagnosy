import mongoose from 'mongoose';
import { logger } from './logger.js';

// --- Constants ---
const DB_URI = process.env.DB ?? '';
const ERRORS = {
  CONNECT_FAILED: (msg) => `MongoDB connection error: ${msg}`,
  DISCONNECT_FAILED: (msg) => `MongoDB disconnection error: ${msg}`,
};

/**
 * DatabaseConfig
 * @description Manages MongoDB connection and disconnection operations.
 */
export const DatabaseConfig = {
  /**
   * Connects to MongoDB using the configured URI
   * @async
   * @returns {Promise<void>} Resolves when connected
   * @throws {Error} If connection fails
   */
  connect: async () => {
    try {
      if (!DB_URI) throw new Error('MongoDB URI is missing');
      await mongoose.connect(DB_URI);
      logger.info('MongoDB connected');
    } catch (error) {
      logger.error(ERRORS.CONNECT_FAILED(error.message));
      throw new Error(ERRORS.CONNECT_FAILED(error.message));
    }
  },

  /**
   * Disconnects from MongoDB
   * @async
   * @returns {Promise<void>} Resolves when disconnected
   * @throws {Error} If disconnection fails
   */
  disconnect: async () => {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error(ERRORS.DISCONNECT_FAILED(error.message));
      throw new Error(ERRORS.DISCONNECT_FAILED(error.message));
    }
  },
};

export default DatabaseConfig;
