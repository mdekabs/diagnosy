import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { LoggerConfig } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SwaggerConfig {
  static #logger = LoggerConfig.getLogger();
  static #swaggerDocument = YAML.load(path.join(__dirname, "../openapi.yaml"));

  static setup(app) {
    try {
      const options = {
        customSiteTitle: "My API Docs",
        customCss: ".swagger-ui .topbar { display: none }",
      };

      app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(this.#swaggerDocument, options));
      this.#logger.info("Swagger UI available at /api-docs");
    } catch (error) {
      this.#logger.error(`Swagger UI setup error: ${error.message}`);
      throw new Error(`Swagger UI setup failed: ${error.message}`);
    }
  }
}
