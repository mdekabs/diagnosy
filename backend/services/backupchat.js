/**
 * Chat Service
 * ------------
 * Handles chat lifecycle operations:
 * - Starting/continuing sessions
 * - Running pre-check validation (crisis, blocked input, empty input)
 * - Building context for the AI model
 * - Saving encrypted messages (via Message model)
 * - Returning paginated chat history
 * - Clearing / ending sessions
 *
 * Works with a de-normalized message storage structure.
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
  isBlocked
} from '../utils/chat_helpers.js';

import {
  sanitizePaginationParams,
  generatePaginationLinks,
} from '../utils/pagination.js';

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                   */
/* -------------------------------------------------------------------------- */

const ERRORS = {
  NO_INPUT: M.NO_INPUT,
  REFUSAL: M.REFUSAL,
  CHAT_NOT_FOUND: M.CHAT_NOT_FOUND,
  CHAT_ID_REQUIRED: 'Chat ID is required to continue a conversation.',
};

/* -------------------------------------------------------------------------- */
/*                           PRE-PROCESSING CHECKS                             */
/* -------------------------------------------------------------------------- */
/**
 * Runs inexpensive checks before doing AI work:
 * - Empty input
 * - Blocked/offensive content
 * - Crisis detection
 *
 * @param {string} input
 * @returns {{ input: string, isCrisisResponse: boolean }}
 */
const handlePreChatChecks = (input) => {
  if (!input?.trim()) throw new Error(ERRORS.NO_INPUT);

  const trimmed = input.trim();
  if (isBlocked(trimmed)) throw new Error(ERRORS.REFUSAL);

  if (isCrisis(trimmed)) {
    return { isCrisisResponse: true, input: trimmed };
  }

  return { isCrisisResponse: false, input: trimmed };
};

/* -------------------------------------------------------------------------- */
/*                                CHAT SERVICE                                 */
/* -------------------------------------------------------------------------- */

export const ChatService = {
  /* ---------------------------------------------------------------------- */
  /*                          PROCESS INCOMING MESSAGE                      */
  /* ---------------------------------------------------------------------- */
  /**
   * Handles both new and continued chat sessions.
   * Builds the appropriate message context for the Gemini model.
   * Supports streaming AI output.
   */
  handleChat: async (payload) => {
    const { userID, message, chatId } = payload;

    const preCheck = handlePreChatChecks(message);
    const userObjectId = toId(userID);
    const isNewSession = !chatId;

    let chat;
    let messages = [];

    /* ------------------------ CRISIS FAST-RESPONSE ----------------------- */
    if (preCheck.isCrisisResponse) {
      return {
        status: STATUS.SUCCESS,
        data: {
          advice: CRISIS_RESPONSE,
          isCrisis: true,
          isContinued: !isNewSession,
        },
      };
    }

    /* ----------------------------- NEW SESSION --------------------------- */
    if (isNewSession) {
      // First message in the session is turned into a special initializing prompt
      messages.push({ role: 'user', content: CHAT_PROMPT(preCheck.input) });
    }

    /* --------------------------- CONTINUED SESSION ----------------------- */
    else {
      chat = await Chat.findOne({
        _id: toId(chatId),
        userID: userObjectId,
      }).exec();

      if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

      // Fetch last 20 most recent messages (DESC), then reverse to chronological order
      const recentMessages = await chat.getHistory(20);

      if (!recentMessages.length) {
        // Chat exists but no messages stored
        messages.push({ role: 'user', content: CHAT_PROMPT(preCheck.input) });
      } else {
        const orderedContext = recentMessages.reverse();

        messages = [
          // Convert stored messages to model-compatible roles
          ...orderedContext.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content, // Already decrypted via mongoose getter
          })),
          { role: 'user', content: preCheck.input },
        ];
      }
    }

    /* --------------------------- CLASSIFICATION -------------------------- */
    if (isNewSession) {
      try {
        const classification = (
          await GeminiService.generateResponseNonStream([
            { role: 'user', content: CLASSIFICATION_PROMPT(preCheck.input) },
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
    }

    /* ------------------------------ AI STREAM ----------------------------- */
    const stream = await GeminiService.generateResponseStream(messages);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: {
        userID: userObjectId,
        input: preCheck.input,
        isNewSession,
        chatId,
      },
    };
  },

  /* ---------------------------------------------------------------------- */
  /*                               FINALIZE CHAT                            */
  /* ---------------------------------------------------------------------- */
  /**
   * Saves the user & assistant messages after the AI finishes streaming.
   */
  finalizeResponse: async (payload) => {
    const { userID, input, aiResponse, chatId } = payload;

    const userObjectId = toId(userID);

    // Find existing chat or create a new one
    const chat = chatId
      ? await Chat.findById(chatId).exec()
      : await Chat.findOrCreate(userObjectId);

    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const finalResponse = isCrisis(aiResponse)
      ? CRISIS_RESPONSE
      : aiResponse;

    const fullResponse = `${finalResponse}${
      !chat.disclaimerAdded ? `\n\n_${DISCLAIMER}_` : ''
    }`;

    /* ------------------------ SAVE DE-NORMALIZED MESSAGES ------------------------ */
    await chat.addMessage('user', input);           // Save user message
    await chat.addMessage('assistant', fullResponse); // Save assistant response

    await Chat.updateOne(
      { _id: chat._id },
      { $set: { disclaimerAdded: true } }
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

  /* ---------------------------------------------------------------------- */
  /*                           GET USER CHAT HISTORY                         */
  /* ---------------------------------------------------------------------- */
  /**
   * Fetches paginated message history for the user’s primary chat session.
   * Uses Message collection directly (de-normalized model).
   */
  getChatHistory: async (payload) => {
    const { userID, page, limit, baseUrl } = payload;

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

    const chat = await Chat.findOne({ userID: toId(userID) }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Fetch message history + total count in parallel
    const [history, totalItems] = await Promise.all([
      Message.find({ chatId: chat._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(sanitizedLimit)
        .exec(), // ensures decrypted content
      Message.countDocuments({ chatId: chat._id }),
    ]);

    const totalPages = Math.ceil(totalItems / sanitizedLimit);

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

  /* ---------------------------------------------------------------------- */
  /*                          GET CHAT HISTORY BY ID                        */
  /* ---------------------------------------------------------------------- */
  /**
   * Fetches paginated message history for a specific chat session.
   */
  getChatById: async (payload) => {
    const { chatId, page, limit, baseUrl } = payload;

    if (!chatId) throw new Error(ERRORS.CHAT_ID_REQUIRED);

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

    const chat = await Chat.findById(chatId).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const [history, totalItems] = await Promise.all([
      Message.find({ chatId: chat._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(sanitizedLimit)
        .exec(),
      Message.countDocuments({ chatId: chat._id }),
    ]);

    const totalPages = Math.ceil(totalItems / sanitizedLimit);

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

  /* ---------------------------------------------------------------------- */
  /*                               CLEAR SESSION                             */
  /* ---------------------------------------------------------------------- */
  /**
   * Clears all messages from the user’s primary chat document.
   */
  clearChat: async (payload) => {
    const { userID } = payload;

    const chat = await Chat.findOne({ userID: toId(userID) }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    // Delete all messages for this chat
    await Message.deleteMany({ chatId: chat._id }).exec();

    // Reset disclaimer
    await Chat.updateOne(
      { _id: chat._id },
      { $set: { disclaimerAdded: false } }
    ).exec();

    return { status: STATUS.SUCCESS, message: 'Conversation cleared' };
  },

  /* ---------------------------------------------------------------------- */
  /*                                END SESSION                              */
  /* ---------------------------------------------------------------------- */
  /**
   * Removes the chat document and all associated messages.
   */
  endChat: async (payload) => {
    const { userID } = payload;

    const chat = await Chat.findOne({ userID: toId(userID) }).exec();

    if (chat) {
      await Message.deleteMany({ chatId: chat._id }).exec();
      await Chat.deleteOne({ _id: chat._id }).exec();
    }

    return {
      status: STATUS.SUCCESS,
      message: 'Conversation ended. Take care.',
    };
  },
};
