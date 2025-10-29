// src/controllers/chatController.js
import HttpStatus from "http-status-codes";
import { ChatService } from "../services/index.js";
import { responseHandler } from "../utils/index.js";
import { logger } from "../config/index.js";

/**
 * ------------------------------------------------------------------
 *  ChatController – HTTP-only layer
 *  Handles chat history retrieval.
 * ------------------------------------------------------------------
 */
export class ChatController {
  /** GET /api/chat/history */
  static async getChatHistory(req, res) {
    try {
      const result = await ChatService.getChatHistory(req.userID);
      responseHandler(
        res,
        HttpStatus.OK,
        result.status,
        result.message,
        result.data
      );
    } catch (err) {
      logger.error(`getChatHistory: ${err.message}`);
      responseHandler(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        "error",
        err.message
      );
    }
  }
}

export default ChatController;

