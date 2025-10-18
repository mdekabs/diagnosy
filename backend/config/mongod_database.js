import mongoose from "mongoose";
import { LoggerConfig } from "./logger.js";

export class DatabaseConfig {
  static #logger = LoggerConfig.getLogger();

  static async connect() {
    try {
      await mongoose.connect(process.env.DB);
      this.#logger.info("MongoDB connected");
    } catch (error) {
      this.#logger.error(`MongoDB connection error: ${error.message}`);
      throw error;
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      this.#logger.info("MongoDB disconnected");
    } catch (error) {
      this.#logger.error(`MongoDB disconnection error: ${error.message}`);
      throw error;
    }
  }
}
