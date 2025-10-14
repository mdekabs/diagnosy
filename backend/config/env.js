import dotenv from 'dotenv';
import { logger } from './logger.js';

export const env = process.env.NODE_ENV || 'development';

// Map environment to respective .env file
const envFileMap = {
  development: '.env.development',
  test: '.env.test',
  production: '.env.production',
};

const envFile = envFileMap[env] || '.env.development';

dotenv.config({ path: envFile, quite: true });


export default env;
