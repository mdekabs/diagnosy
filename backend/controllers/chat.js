// controllers/chat.js
import HttpStatus from 'http-status-codes';
import { ChatService } from '../services/index.js';
import { responseHandler } from '../utils/index.js';
import { logger } from '../config/index.js';

/**
 * ChatController
 * Handles HTTP endpoints for the encrypted single-chat-per-user system.
 * Keeps the controller thin — all business logic and messages live in ChatService.
 */
export const ChatController = {

  /**
   * GET /chat/history
   * Returns paginated, decrypted conversation history for the authenticated user.
   */
  getChatHistory: async (req, res) => {
    try {
      const { page, limit } = req.query;

      const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;

      const result = await ChatService.getChatHistory({
        userID: req.userID,
        page,
        limit,
        baseUrl,
      });

      responseHandler(
        res,
        HttpStatus.OK,
        result.status,
        result.message,
        result.data,
        result.pagination
      );
    } catch (err) {
      logger.error(`getChatHistory error: ${err.message}`);

      // Only one possible error from service: "No active conversation found..."
      const status = err.message.includes('No active conversation')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;

      responseHandler(res, status, 'error', err.message);
    }
  },
}
