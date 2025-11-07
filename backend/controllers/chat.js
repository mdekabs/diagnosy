// src/controllers/chatController.js
import HttpStatus from "http-status-codes";
import { ChatService } from "../services/index.js";
import { responseHandler } from "../utils/index.js";
import { logger } from "../config/index.js";

/**
 * ------------------------------------------------------------------
 *  ChatController – HTTP-only layer
 *  Handles chat-related HTTP requests.
 * ------------------------------------------------------------------
 */
export class ChatController {
  /** GET /api/chat/history */
  static async getChatHistory(req, res) {
    try {
      const { page, limit } = req.query;
      const baseUrl = `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`;
      const result = await ChatService.getChatHistory(req.userID, page, limit, baseUrl);
      responseHandler(
        res,
        HttpStatus.OK,
        result.status,
        result.message,
        result.data,
        result.pagination
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

  /** GET /api/chat/:id */
  static async getChatById(req, res) {
    try {
      const chatId = req.params.id;
      const { page, limit } = req.query;
      const baseUrl = `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`;
      const result = await ChatService.getChatById(chatId, page, limit, baseUrl);
      responseHandler(
        res,
        HttpStatus.OK,
        result.status,
        result.message,
        result.data,
        result.pagination
      );
    } catch (err) {
      logger.error(`getChatById: ${err.message}`);
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
