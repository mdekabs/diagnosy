import HttpStatus from "http-status-codes";
import { ChatService } from "../services/index.js";
import { responseHandler } from "../utils/index.js";
import { logger } from "../config/index.js";

/**
 * ------------------------------------------------------------------
 *  ChatController – HTTP-only layer
 *  All business rules live in ChatService.
 * ------------------------------------------------------------------
 */

const errorStatus = (err) => {
  const msg = err.message;

  // Validation / domain errors
  if (
    msg.includes("Please share how you're feeling") ||
    msg.includes("specialize in stress") ||
    msg.includes("message is required") ||
    msg.includes("No active conversation")
  ) {
    return HttpStatus.BAD_REQUEST;
  }

  if (msg.includes("not found")) {
    return HttpStatus.NOT_FOUND;
  }

  if (msg.includes("Gemini") || msg.includes("generateResponse")) {
    return HttpStatus.GATEWAY_TIMEOUT;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
};

export class ChatController {
  /** POST /api/chat/start  →  { "message": "…" } */
  static async createChat(req, res) {
    try {
      const { message } = req.body;
      const result = await ChatService.createChat(req.userID, message);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      logger.error(`createChat: ${err.message}`);
      responseHandler(res, errorStatus(err), "error", err.message);
    }
  }

  /** POST /api/chat/continue  →  { "message": "…" } */
  static async continueChat(req, res) {
    try {
      const { message } = req.body;
      const result = await ChatService.continueChat(req.userID, message);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      logger.error(`continueChat: ${err.message}`);
      responseHandler(res, errorStatus(err), "error", err.message);
    }
  }

  /** GET /api/chat/history */
  static async getChatHistory(req, res) {
    try {
      const result = await ChatService.getChatHistory(req.userID);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      logger.error(`getChatHistory: ${err.message}`);
      responseHandler(res, errorStatus(err), "error", err.message);
    }
  }

  /** POST /api/chat/end */
  static async endChat(req, res) {
    try {
      const result = await ChatService.endChat(req.userID);
      responseHandler(res, HttpStatus.OK, result.status, result.message);
    } catch (err) {
      logger.error(`endChat: ${err.message}`);
      responseHandler(res, HttpStatus.INTERNAL_SERVER_ERROR, "error", err.message);
    }
  }
}

export default ChatController;
