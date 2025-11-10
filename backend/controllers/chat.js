import HttpStatus from 'http-status-codes';
import { ChatService } from '../services/index.js';
import { responseHandler } from '../utils/index.js';
import { logger } from '../config/index.js';

// --- Constants ---
const ERROR_STATUSES = {
  'No active conversation found. Start by sharing your feelings.': HttpStatus.NOT_FOUND,
  'Chat ID is required.': HttpStatus.BAD_REQUEST,
  'Chat not found': HttpStatus.NOT_FOUND,
};

/**
 * @typedef {Object} ResponseData
 * @property {string} status - Response status ('success' or 'error')
 * @property {string} message - Response message
 * @property {Object} [data] - Optional response data
 * @property {Object} [pagination] - Optional pagination metadata
 */

/**
 * ChatController
 * @description Handles HTTP requests for chat-related operations, interfacing with ChatService.
 */
export const ChatController = {
  /**
   * Retrieves paginated chat history for the authenticated user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with chat history or error
   */
  getChatHistory: async (req, res) => {
    try {
      const { page, limit } = req.query;
      const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
      const result = await ChatService.getChatHistory(req.userID, page, limit, baseUrl);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data, result.pagination);
    } catch (err) {
      logger.error(`getChatHistory failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

  /**
   * Retrieves paginated chat history by chat ID
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with chat history or error
   */
  getChatById: async (req, res) => {
    try {
      const { id: chatId } = req.params;
      const { page, limit } = req.query;
      const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
      const result = await ChatService.getChatById(chatId, page, limit, baseUrl);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data, result.pagination);
    } catch (err) {
      logger.error(`getChatById failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },
};

export default ChatController;
