import dotenv from 'dotenv';
import { logger } from './index.js';

export class EnvConfig {
  static env = process.env.NODE_ENV ?? 'development';

  static #envFileMap = {
    development: '.env.development',
    test: '.env.test',
    production: '.env.production',
  };

  static #envFile = this.#envFileMap[this.env] || '.env.development';

  static initialize() {
    try {
      dotenv.config({ path: this.#envFile, quiet: true });
      logger.info(`Environment configuration loaded for ${this.env} from ${this.#envFile}`);
    } catch (error) {
      logger.error(`Failed to load environment configuration from ${this.#envFile}: ${error.message}`);
      throw new Error(`Environment configuration failed: ${error.message}`);
    }
  }

  static getEnv() {
    return this.env;
  }
}
