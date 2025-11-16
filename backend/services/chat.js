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

import {
  sanitizePaginationParams,
  generatePaginationLinks,
  getPaginatedHistory,
} from '../utils/pagination.js';

// --- Constants ---
const ERRORS = {
  NO_INPUT: M.NO_INPUT,
  REFUSAL: M.REFUSAL,
  CHAT_NOT_FOUND: M.CHAT_NOT_FOUND,
  CHAT_ID_REQUIRED: 'Chat ID is required.',
};

export const ChatService = {
  /**
   * Creates a new chat session and streams an AI response
   * @param {Object} payload
   * @param {string} payload.userID
   * @param {string} payload.message
   */
  createChat: async (payload) => {
    const { userID, message } = payload;

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
      const classification = (
        await GeminiService.generateResponseNonStream([
          { role: 'user', content: classificationPrompt },
        ])
      )
        .toUpperCase()
        .trim();

      if (classification.includes('OFF_TOPIC'))
        throw new Error(ERRORS.REFUSAL);

      if (classification.includes('CRISIS')) {
        return {
          status: STATUS.SUCCESS,
          data: {
            advice: CRISIS_RESPONSE,
            isCrisis: true,
            isContinued: false,
          },
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
      metadata: {
        userID: userIdObj,
        input,
        isNewSession: true,
        chatId: null,
      },
    };
  },

  /**
   * Continues an existing chat
   * @param {Object} payload
   * @param {string} payload.userID
   * @param {string} payload.message
   */
  continueChat: async (payload) => {
    const { userID, message } = payload;

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
    if (!chat || !chat.history.length)
      throw new Error(ERRORS.CHAT_NOT_FOUND);

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
      metadata: {
        userID: userIdObj,
        input,
        chatId: chat._id.toString(),
      },
    };
  },

  /**
   * Finalizes chat response
   * @param {Object} payload
   * @param {string} payload.userID
   * @param {string} payload.input
   * @param {string} payload.aiResponse
   * @param {string} [payload.chatId]
   */
  finalizeResponse: async (payload) => {
    const { userID, input, aiResponse, chatId } = payload;

    const userIdObj = toId(userID);
    const chat = chatId
      ? await Chat.findById(chatId).exec()
      : await Chat.findOrCreate(userIdObj);

    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const finalResponse = isCrisis(aiResponse)
      ? CRISIS_RESPONSE
      : aiResponse;

    const fullResponse = `${finalResponse}${
      !chat.disclaimerAdded ? `\n\n_${DISCLAIMER}_` : ''
    }`;

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
   * Returns paginated history
   * @param {Object} payload
   * @param {string} payload.userID
   * @param {number} payload.page
   * @param {number} payload.limit
   * @param {string} payload.baseUrl
   */
  getChatHistory: async (payload) => {
    const { userID, page, limit, baseUrl } = payload;

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

    const userIdObj = toId(userID);

    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const { history, totalItems, totalPages } =
      await getPaginatedHistory(
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
        links: generatePaginationLinks(
          sanitizedPage,
          sanitizedLimit,
          totalItems,
          baseUrl
        ),
      },
    };
  },

  /**
   * Returns history by ID
   * @param {Object} payload
   * @param {string} payload.chatId
   * @param {number} payload.page
   * @param {number} payload.limit
   * @param {string} payload.baseUrl
   */
  getChatById: async (payload) => {
    const { chatId, page, limit, baseUrl } = payload;

    if (!chatId) throw new Error(ERRORS.CHAT_ID_REQUIRED);

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

    const chat = await Chat.findById(chatId).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const { history, totalItems, totalPages } =
      await getPaginatedHistory(
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
        links: generatePaginationLinks(
          sanitizedPage,
          sanitizedLimit,
          totalItems,
          baseUrl
        ),
      },
    };
  },

  /**
   * Clears chat
   * @param {Object} payload
   * @param {string} payload.userID
   */
  clearChat: async (payload) => {
    const { userID } = payload;

    const userIdObj = toId(userID);
    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    await Chat.updateOne(
      { userID: userIdObj },
      { history: [], disclaimerAdded: false }
    ).exec();

    return { status: STATUS.SUCCESS, message: 'Conversation cleared' };
  },

  /**
   * Ends chat session
   * @param {Object} payload
   * @param {string} payload.userID
   */
  endChat: async (payload) => {
    const { userID } = payload;

    await Chat.deleteOne({ userID: toId(userID) }).exec();

    return {
      status: STATUS.SUCCESS,
      message: 'Conversation ended. Take care.',
    };
  },
};
