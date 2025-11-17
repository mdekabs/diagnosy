import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

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

// -----------------
// Database & Redis
// -----------------
await DatabaseConfig.connect();
RedisConfig.initialize();
await RedisConfig.connect();

// -----------------
// CORS (must come BEFORE Swagger + routes)
// -----------------
const corsOptions = {
  origin: "*", // Allow all temporarily; restrict in production if needed
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// -----------------
// Swagger Docs
// -----------------
SwaggerConfig.setup(app);

// -----------------
// Express Middleware
// -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(appLogger);
app.use(express.static("pub"));

// -----------------
// API Routes
// -----------------
app.use("/api", routes);

// -----------------
// Error Middleware
// -----------------
app.use(errorLogger);
app.use(errorMiddleware);

logger.info("Express application initialized");

// -----------------
// WebSocket Server
// -----------------
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", handleWebSocketConnection);
logger.info("WebSocket server attached to HTTP server");

export { app, httpServer };
