import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { handleWebSocketConnection } from "./websocket/web_socket_handler.js";
import {
  env,
  logger,
  appLogger,
  errorLogger,
  DatabaseConfig,
  RedisConfig,
  SwaggerConfig,
} from "./config/index.js";
import routes from "./routes/index.js";
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

logger.info("Express application initialized");

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", handleWebSocketConnection);
logger.info("WebSocket server attached to HTTP server");

export { app, httpServer };

