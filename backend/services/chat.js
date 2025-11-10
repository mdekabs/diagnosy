import { Chat } from '../models/chat.js';
import { GeminiService } from './gemini.js';
import { logger } from '../config/index.js';
import {
  STATUS,
  M,
  DISCLAIMER,
  CRISIS_RESPONSE,
  CLASSIFICATION_PROMPT,
  CHAT_PROMPT,
  CONTINUE_PROMPT,
  toId,
  isCrisis,
  isBlocked,
} from '../utils/chat_helpers.js';
import { sanitizePaginationParams, generatePaginationLinks, getPaginatedHistory } from '../utils/pagination.js';

// --- Constants ---
const ERRORS = {
  NO_INPUT: M.NO_INPUT,
  REFUSAL: M.REFUSAL,
  CHAT_NOT_FOUND: M.CHAT_NOT_FOUND,
  CHAT_ID_REQUIRED: 'Chat ID is required.',
};

/**
 * @typedef {Object} PaginationParams
 * @property {number} page - Page number for pagination
 * @property {number} limit - Items per page
 * @property {string} baseUrl - Base URL for HATEOAS links
 */

/**
 * @typedef {Object} FinalizeResponseData
 * @property {string} userID - User ID
 * @property {string} input - User input message
 * @property {string} aiResponse - AI-generated response
 * @property {string} [chatId] - Chat session ID (optional)
 */

/**
 * ChatService
 * @description Manages chat operations for the mental health companion feature, including creation, continuation, finalization, and history retrieval.
 */
export const ChatService = {
  /**
   * Creates a new chat session and streams an AI response
   * @async
   * @param {string} userID - User ID
   * @param {string} message - User's input message
   * @returns {Promise<{status: string, stream?: AsyncIterable, metadata?: {userID: string, input: string, isNewSession: boolean, chatId: null}, data?: {advice: string, isCrisis: boolean, isContinued: boolean}}>} Chat creation result
   * @throws {Error} If input is invalid or message is blocked
   */
  createChat: async (userID, message) => {
    if (!message?.trim()) throw new Error(ERRORS.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    if (isBlocked(input)) throw new Error(ERRORS.REFUSAL);
    if (isCrisis(input)) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
      };
    }

    try {
      const classificationPrompt = CLASSIFICATION_PROMPT(input);
      const classification = (await GeminiService.generateResponseNonStream([
        { role: 'user', content: classificationPrompt },
      ])).toUpperCase().trim();

      if (classification.includes('OFF_TOPIC')) throw new Error(ERRORS.REFUSAL);
      if (classification.includes('CRISIS')) {
        return {
          status: STATUS.SUCCESS,
          data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
        };
      }
    } catch (err) {
      logger.error(`Classification error: ${err.message}`);
    }

    const stream = await GeminiService.generateResponseStream([
      { role: 'user', content: CHAT_PROMPT(input) },
    ]);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, isNewSession: true, chatId: null },
    };
  },

  /**
   * Continues an existing chat session and streams a response
   * @async
   * @param {string} userID - User ID
   * @param {string} message - User's input message
   * @returns {Promise<{status: string, stream: AsyncIterable, metadata: {userID: string, input: string, chatId: string}}>} Chat continuation result
   * @throws {Error} If input is invalid, message is blocked, or chat not found
   */
  continueChat: async (userID, message) => {
    if (!message?.trim()) throw new Error(ERRORS.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    if (isBlocked(input)) throw new Error(ERRORS.REFUSAL);
    if (isCrisis(input)) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: true },
      };
    }

    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat || !chat.history.length) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const context = chat.getDecryptedHistory().slice(-10);
    const messages = [
      ...context.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      })),
      { role: 'user', content: input },
    ];

    const stream = await GeminiService.generateResponseStream(messages);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, chatId: chat._id.toString() },
    };
  },

  /**
   * Finalizes a chat response by saving user and AI messages
   * @async
   * @param {FinalizeResponseData} data - Chat response data
   * @returns {Promise<{status: string, message: string, data: {advice: string, isNewSession: boolean, isContinued: boolean, isCrisis: boolean}}>} Finalization result
   * @throws {Error} If chat not found or DB error occurs
   */
  finalizeResponse: async ({ userID, input, aiResponse, chatId }) => {
    const userIdObj = toId(userID);
    const chat = chatId
      ? await Chat.findById(chatId).exec()
      : await Chat.findOrCreate(userIdObj);

    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const finalResponse = isCrisis(aiResponse) ? CRISIS_RESPONSE : aiResponse;
    const fullResponse = `${finalResponse}${!chat.disclaimerAdded ? `\n\n_${DISCLAIMER}_` : ''}`;

    await chat.addMessage('user', input);
    await chat.addMessage('assistant', fullResponse);

    await Chat.updateOne(
      { _id: chat._id },
      { disclaimerAdded: true, lastActive: new Date() }
    ).exec();

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        advice: fullResponse,
        isNewSession: !chatId,
        isContinued: !!chatId,
        isCrisis: finalResponse === CRISIS_RESPONSE,
      },
    };
  },

  /**
   * Retrieves paginated chat history for a user
   * @async
   * @param {string} userID - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} baseUrl - Base URL for HATEOAS links
   * @returns {Promise<{status: string, message: string, data: {history: Array, startedAt: Date, lastActive: Date}, pagination: {totalItems: number, totalPages: number, currentPage: number, limit: number, links: Object}}>} Paginated chat history
   * @throws {Error} If chat not found
   */
  getChatHistory: async (userID, page, limit, baseUrl) => {
    const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePaginationParams(page, limit);
    const userIdObj = toId(userID);

    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const { history, totalItems, totalPages } = await getPaginatedHistory(
      { userID: userIdObj },
      sanitizedPage,
      sanitizedLimit
    );

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        history,
        startedAt: chat.createdAt,
        lastActive: chat.updatedAt,
      },
      pagination: {
        totalItems,
        totalPages,
        currentPage: sanitizedPage,
        limit: sanitizedLimit,
        links: generatePaginationLinks(sanitizedPage, sanitizedLimit, totalItems, baseUrl),
      },
    };
  },

  /**
   * Retrieves paginated chat history by chat ID
   * @async
   * @param {string} chatId - Chat ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} baseUrl - Base URL for HATEOAS links
   * @returns {Promise<{status: string, message: string, data: {chatId: string, userID: string, history: Array, startedAt: Date, lastActive: Date}, pagination: {totalItems: number, totalPages: number, currentPage: number, limit: number, links: Object}}>} Paginated chat history
   * @throws {Error} If chat ID is missing or chat not found
   */
  getChatById: async (chatId, page, limit, baseUrl) => {
    if (!chatId) throw new Error(ERRORS.CHAT_ID_REQUIRED);

    const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePaginationParams(page, limit);
    const chat = await Chat.findById(chatId).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const { history, totalItems, totalPages } = await getPaginatedHistory(
      { _id: toId(chatId) },
      sanitizedPage,
      sanitizedLimit
    );

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        chatId: chat._id.toString(),
        userID: chat.userID,
        history,
        startedAt: chat.createdAt,
        lastActive: chat.updatedAt,
      },
      pagination: {
        totalItems,
        totalPages,
        currentPage: sanitizedPage,
        limit: sanitizedLimit,
        links: generatePaginationLinks(sanitizedPage, sanitizedLimit, totalItems, baseUrl),
      },
    };
  },

  /**
   * Clears all messages in a user's chat session
   * @async
   * @param {string} userID - User ID
   * @returns {Promise<{status: string, message: string}>} Clear result
   * @throws {Error} If chat not found
   */
  clearChat: async (userID) => {
    const userIdObj = toId(userID);
    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    await Chat.updateOne({ userID: userIdObj }, { history: [], disclaimerAdded: false }).exec();
    return { status: STATUS.SUCCESS, message: 'Conversation cleared' };
  },

  /**
   * Deletes a user's chat session
   * @async
   * @param {string} userID - User ID
   * @returns {Promise<{status: string, message: string}>} Deletion result
   */
  endChat: async (userID) => {
    await Chat.deleteOne({ userID: toId(userID) }).exec();
    return { status: STATUS.SUCCESS, message: 'Conversation ended. Take care.' };
  },
};
