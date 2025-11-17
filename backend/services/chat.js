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
  toId,
  isCrisis,
  isBlocked,
} from '../utils/chat_helpers.js';

import {
  sanitizePaginationParams,
  generatePaginationLinks,
  getPaginatedHistory,
} from '../utils/pagination.js';

const ERRORS = {
  NO_INPUT: M.NO_INPUT,
  REFUSAL: M.REFUSAL,
  CHAT_NOT_FOUND: M.CHAT_NOT_FOUND,
  CHAT_ID_REQUIRED: 'Chat ID is required to continue a conversation.',
};

/**
 * Performs fast validation checks before expensive AI operations.
 * @param {string} input - User message.
 * @returns {{ input: string, isCrisisResponse: boolean }}
 */
const handlePreChatChecks = (input) => {
  if (!input?.trim()) throw new Error(ERRORS.NO_INPUT);
  const trimmedInput = input.trim();

  if (isBlocked(trimmedInput)) throw new Error(ERRORS.REFUSAL);
  if (isCrisis(trimmedInput)) {
    return { isCrisisResponse: true, input: trimmedInput };
  }

  return { isCrisisResponse: false, input: trimmedInput };
};

export const ChatService = {
  /**
   * Processes a chat message, starts new sessions, or continues existing ones.
   * Generates streamed AI output and classification checks when required.
   */
  handleChat: async (payload) => {
    const { userID, message, chatId } = payload;

    const preCheck = handlePreChatChecks(message);
    const userIdObj = toId(userID);
    const isNewSession = !chatId;

    let chat;
    let messages = [];

    if (preCheck.isCrisisResponse) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: !isNewSession },
      };
    }

    if (isNewSession) {
      messages.push({ role: 'user', content: CHAT_PROMPT(preCheck.input) });
    } else {
      chat = await Chat.findOne({
        _id: toId(chatId),
        userID: userIdObj,
      }).exec();

      if (!chat || !chat.history.length) throw new Error(ERRORS.CHAT_NOT_FOUND);

      const context = chat.getDecryptedHistory().slice(-20);

      messages = [
        ...context.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content,
        })),
        { role: 'user', content: preCheck.input },
      ];
    }

    if (isNewSession) {
      try {
        const classification = (
          await GeminiService.generateResponseNonStream([
            { role: 'user', content: CLASSIFICATION_PROMPT(preCheck.input) },
          ])
        )
          .toUpperCase()
          .trim();

        if (classification.includes('OFF_TOPIC')) throw new Error(ERRORS.REFUSAL);

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
    }

    const stream = await GeminiService.generateResponseStream(messages);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: {
        userID: userIdObj,
        input: preCheck.input,
        isNewSession,
        chatId,
      },
    };
  },

  /**
   * Saves final user + AI messages into chat history atomically.
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

    const historyUpdate = [
      { role: 'user', content: input },
      { role: 'assistant', content: fullResponse },
    ];

    await Chat.updateOne(
      { _id: chat._id },
      {
        $push: { history: { $each: historyUpdate } },
        $set: {
          disclaimerAdded: true,
          lastActive: new Date(),
        },
      }
    ).exec();

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        advice: fullResponse,
        chatId: chat._id.toString(),
        isNewSession: !chatId,
        isContinued: !!chatId,
        isCrisis: finalResponse === CRISIS_RESPONSE,
      },
    };
  },

  /**
   * Retrieves paginated chat history for the user's primary chat document.
   */
  getChatHistory: async (payload) => {
    const { userID, page, limit, baseUrl } = payload;

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

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
   * Retrieves paginated chat history for a specific session by ID.
   */
  getChatById: async (payload) => {
    const { chatId, page, limit, baseUrl } = payload;
    if (!chatId) throw new Error(ERRORS.CHAT_ID_REQUIRED);

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

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
   * Clears all messages from the user's primary chat session.
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
   * Deletes the user's primary chat document, ending the session.
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
