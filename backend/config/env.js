import dotenv from 'dotenv';

export const env = process.env.NODE_ENV ?? 'development';

const envFileMap = {
  development: '.env.development',
  test: '.env.test',
  production: '.env.production',
};

const envFile = envFileMap[env] || '.env.development';

dotenv.config({ path: envFile, quiet: true });


export default env;
