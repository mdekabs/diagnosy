import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { appLogger, errorLogger, logger } from "./middleware/_logger.js"; // Import the loggers

const app = express();
const port = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Attach request logger (Logs every incoming request)
app.use(appLogger);

app.use(router);

// ✅ Attach error logger (Logs errors in API responses)
app.use(errorLogger);

// ✅ Start the server
app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port}`);
});
