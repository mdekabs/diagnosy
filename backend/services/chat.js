/**
 * ChatService Module
 * -------------------
 * Handles:
 *  - Chat message processing with Gemini AI
 *  - Crisis/off-topic classification
 *  - De-normalized message storage
 *  - Pagination of messages
 *  - Session management (start, clear, end)
 */

import { Chat, Message } from '../models/chat.js';
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
} from '../utils/pagination.js';

const ERRORS = {
  NO_INPUT: M.NO_INPUT,
  REFUSAL: M.REFUSAL,
  CHAT_NOT_FOUND: M.CHAT_NOT_FOUND,
  CHAT_ID_REQUIRED: 'Chat ID is required to continue a conversation.',
};

/**
 * Pre-validates input before AI operations.
 * - Ensures message exists
 * - Ensures it is not blocked
 * - Detects crisis queries early
 */
const handlePreChatChecks = (input) => {
  if (!input?.trim()) throw new Error(ERRORS.NO_INPUT);

  const trimmed = input.trim();

  if (isBlocked(trimmed)) throw new Error(ERRORS.REFUSAL);

  return { input: trimmed, isCrisisResponse: isCrisis(trimmed) };
};

export const ChatService = {
  /**
   * handleChat()
   * -------------------
   * Main entry point for processing user messages.
   * Responsibilities:
   *  - Pre-check input
   *  - Start new chat session OR continue existing one
   *  - Prepare model context
   *  - Run classification on first message
   *  - Stream Gemini response
   *
   * @param {Object} payload
   * @returns {Object}
   */
  handleChat: async ({ userID, message, chatId }) => {
    const preCheck = handlePreChatChecks(message);

    if (preCheck.isCrisisResponse) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: !!chatId },
      };
    }

    const userIdObj = toId(userID);
    const isNewSession = !chatId;
    let messages = [];
    let chat;

    // Build AI prompt context
    if (isNewSession) {
      messages.push({ role: 'user', content: CHAT_PROMPT(preCheck.input) });
    } else {
      chat = await Chat.findOne({ _id: toId(chatId), userID: userIdObj }).exec();
      if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

      const last20 = await chat.getHistory(20); // Most recent messages DESC
      const context = last20.reverse(); // Convert to ASC chronological order

      messages = [
        ...context.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          content: msg.content,
        })),
        { role: 'user', content: preCheck.input },
      ];
    }

    // Classify only first message
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
            data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
          };
        }
      } catch (err) {
        logger.error(`Classification error: ${err.message}`);
      }
    }

    // Get streamed AI response
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
   * finalizeResponse()
   * -------------------
   * Saves the final AI + user messages after streaming completes.
   * Responsibilities:
   *  - Locate or create chat session
   *  - Append user and AI messages
   *  - Update disclaimer status
   *
   * @param {Object} payload
   * @returns {Object}
   */
  finalizeResponse: async ({ userID, input, aiResponse, chatId }) => {
    const userIdObj = toId(userID);

    const chat = chatId
      ? await Chat.findById(chatId).exec()
      : await Chat.findOrCreate(userIdObj);

    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const finalResponse = isCrisis(aiResponse) ? CRISIS_RESPONSE : aiResponse;
    const responseWithDisclaimer = `${finalResponse}${
      !chat.disclaimerAdded ? `\n\n_${DISCLAIMER}_` : ''
    }`;

    await chat.addMessage('user', input);
    await chat.addMessage('assistant', responseWithDisclaimer);

    await Chat.updateOne(
      { _id: chat._id },
      { $set: { disclaimerAdded: true } }
    );

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        advice: responseWithDisclaimer,
        chatId: chat._id.toString(),
        isNewSession: !chatId,
        isContinued: !!chatId,
        isCrisis: finalResponse === CRISIS_RESPONSE,
      },
    };
  },

  /**
   * getChatHistory()
   * -------------------
   * Retrieves paginated message history from the user's primary session.
   * Responsibilities:
   *  - Fetch chat
   *  - Fetch paginated messages
   *  - Auto-run decryption getters
   *  - Build pagination metadata
   *
   * @returns {Object}
   */
  getChatHistory: async ({ userID, page, limit, baseUrl }) => {
    const { page: p, limit: l } = sanitizePaginationParams(page, limit);
    const userIdObj = toId(userID);

    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const skip = (p - 1) * l;

    const [history, total] = await Promise.all([
      Message.find({ chatId: chat._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(l)
        .exec(),
      Message.countDocuments({ chatId: chat._id }),
    ]);

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        history: history.map((d) => d.toObject({ getters: true })),
        startedAt: chat.createdAt,
        lastActive: chat.updatedAt,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / l),
          currentPage: p,
          limit: l,
          links: generatePaginationLinks(p, l, total, baseUrl),
        },
      },
    };
  },
}
