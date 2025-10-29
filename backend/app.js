// src/app.js

import express from "express";
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import the top-level WebSocket connection handler
import { handleWebSocketConnection } from './websocket/web_socket_handler.js'; 

import { env, logger, appLogger, errorLogger, DatabaseConfig, RedisConfig, SwaggerConfig } from "./config/index.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/error_middleware.js";

const app = express(); // 👈 Raw Express Application Instance
logger.info(`Starting application in ${env} environment`);

// --- Initialization ---
await DatabaseConfig.connect();
RedisConfig.initialize();
await RedisConfig.connect();
SwaggerConfig.setup(app);

// --- Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(appLogger);

// --- API Routes ---
app.use("/api", routes);

app.use(errorLogger);
app.use(errorMiddleware);

logger.info("Express server initialized");

// -------------------------------------------------------------
// WebSocket Server Setup 🌐
// -------------------------------------------------------------

// 1. Create the standard HTTP server from the Express application
const httpServer = createServer(app); // 👈 Combined HTTP/WS Server Instance

// 2. Initialize the WebSocket Server and bind it to the HTTP server
const wss = new WebSocketServer({ server: httpServer });

// 3. Attach the connection handler
wss.on('connection', handleWebSocketConnection);
logger.info("WebSocket server attached to HTTP server");

// -------------------------------------------------------------

// Export both for maximum testability:
// - httpServer: Used by server.js to call .listen() (for running the app)
// - app: Used by testing frameworks (e.g., Supertest) to test HTTP routes
export { app, httpServer };
