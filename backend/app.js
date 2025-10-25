import express from "express";
import { env, logger, appLogger, errorLogger, DatabaseConfig, RedisConfig, SwaggerConfig } from "./config/index.js";
import router as routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/error_middleware.js";

const app = express();
logger.info(`Starting application in ${env} environment`);
await DatabaseConfig.connect();
RedisConfig.initialize();
await RedisConfig.connect();
SwaggerConfig.setup(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(appLogger);

app.use("/api", routes);

app.use(errorLogger);
app.use(errorMiddleware);

logger.info("Express server initialized");

export default app;
