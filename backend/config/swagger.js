import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SWAGGER_DOCUMENT = YAML.load(path.join(__dirname, '../openapi.yaml'));
const ERRORS = {
  SETUP_FAILED: (msg) => `Swagger UI setup failed: ${msg}`,
};

/**
 * SwaggerConfig
 * @description Configures Swagger UI for API documentation.
 */
export const SwaggerConfig = {
  /**
   * Sets up Swagger UI middleware for the Express app
   * @param {Object} app - Express application instance
   * @returns {void}
   * @throws {Error} If Swagger UI setup fails
   */
  setup: (app) => {
    try {
      const options = {
        customSiteTitle: 'My API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
      };

      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(SWAGGER_DOCUMENT, options));
      logger.info('Swagger UI available at /api-docs');
    } catch (error) {
      logger.error(ERRORS.SETUP_FAILED(error.message));
      throw new Error(ERRORS.SETUP_FAILED(error.message));
    }
  },
};

export default SwaggerConfig;
