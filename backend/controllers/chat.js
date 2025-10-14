import HttpStatus from "http-status-codes";
import { ChatService } from "../services/chat.js";
import { responseHandler } from "../utils/index.js";

export class ChatController {
  static async createChat(req, res) {
    try {
      const { symptom } = req.body;
      const result = await ChatService.createChat(req.userID, symptom);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      const status = err.message.includes("Symptom") || err.message.includes("health-related") ? HttpStatus.BAD_REQUEST :
                     err.message.includes("Chat history not found") ? HttpStatus.NOT_FOUND :
                     err.message.includes("Gemini API error") ? HttpStatus.GATEWAY_TIMEOUT :
                     HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, "error", err.message);
    }
  }

  static async createGuestChat(req, res) {
    try {
      const { symptom } = req.body;
      const result = await ChatService.createGuestChat(req.guestId, symptom);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      const status = err.message.includes("Symptom") || err.message.includes("health-related") ? HttpStatus.BAD_REQUEST :
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
      const status = err.message.includes("Chat history not found") ? HttpStatus.NOT_FOUND :
                     HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, "error", err.message);
    }
  }
}

export default ChatController;
