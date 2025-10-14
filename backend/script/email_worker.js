import "../config/env.js";
import { emailQueue } from "../jobs/queues/email_queue.js";
import emailWorker from "../jobs/workers/email_processor.js";
import { logger } from "../config/logger.js";


// Start email queue worker
emailQueue.process(emailWorker);
logger.info("Email worker is running and processing jobs...");
