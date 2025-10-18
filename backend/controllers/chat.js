import HttpStatus from "http-status-codes";
import { ChatService } from "../services/index.js";
import { responseHandler } from "../utils/index.js";
import { logger } from "../config/logger.js";

export class ChatController {
  static async createChat(req, res) {
    try {
      const { symptom } = req.body;
      const result = await ChatService.createChat(req.userID, symptom);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      logger.error(`createChat failed: ${err.message}`);
      const status = err.message.includes("Symptom") || err.message.includes("health-related") ? HttpStatus.BAD_REQUEST :
                     err.message.includes("Chat history not found") ? HttpStatus.NOT_FOUND :
                     err.message.includes("Gemini API error") ? HttpStatus.GATEWAY_TIMEOUT :
                     HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, "error", err.message);
    }
  }

  static async getChatHistory(req, res) {
    try {
      const result = await ChatService.getChatHistory(req.userID);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      logger.error(`getChatHistory failed: ${err.message}`);
      const status = err.message.includes("Chat history not found") ? HttpStatus.NOT_FOUND :
                     HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, "error", err.message);
    }
  }
}

export default ChatController;
