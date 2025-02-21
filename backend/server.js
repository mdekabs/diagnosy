import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { appLogger, errorLogger, logger } from "./middleware/_logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply request logging middleware
app.use(appLogger);

// Log server startup
logger.info(`Server is starting on port ${PORT}...`);

// Routes
app.use("/api", routes);

// Apply error logging middleware
app.use(errorLogger);

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Unexpected error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Something went wrong!" });
});

// Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
