import { Chat, Message } from '../models/chat.js'; // Updated to ensure Message is imported
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
  // Removed getPaginatedHistory as it is no longer suitable for the de-normalized model
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
      // For a new session, the first message sets the prompt/context
      messages.push({ role: 'user', content: CHAT_PROMPT(preCheck.input) });
    } else {
      chat = await Chat.findOne({
        _id: toId(chatId),
        userID: userIdObj,
      }).exec();

      if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

      // --- DE-NORMALIZATION FIX: Fetch last 20 messages for context from Message collection ---
      // chat.getHistory(20) returns the 20 most recent messages (DESCENDING order).
      const recentMessages = await chat.getHistory(20);

      if (!recentMessages.length) {
        // If chat exists but has no messages, start fresh with the new prompt
        messages.push({ role: 'user', content: CHAT_PROMPT(preCheck.input) });
      } else {
        // Reverse the array to put messages in chronological order for the AI model
        const context = recentMessages.reverse();

        messages = [
          ...context.map((m) => ({
            // Mongoose getter has already decrypted m.content
            // Assuming 'model' role is required for 'assistant' history messages in the Gemini API format
            role: m.role === 'assistant' ? 'model' : 'user', 
            content: m.content,
          })),
          { role: 'user', content: preCheck.input },
        ];
      }
      // --- END DE-NORMALIZATION FIX ---
    }

    // Classification logic for new sessions (remains the same)
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
   * Saves final user + AI messages by creating new Message documents.
   */
  finalizeResponse: async (payload) => {
    const { userID, input, aiResponse, chatId } = payload;

    const userIdObj = toId(userID);
    // Find chat by ID if provided, otherwise find or create a new one
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

    // --- DE-NORMALIZATION FIX: Save messages via chat.addMessage() ---
    // 1. Save User Message
    await chat.addMessage('user', input);

    // 2. Save AI Message
    await chat.addMessage('assistant', fullResponse);

    // 3. Update Chat metadata (Disclaimer status)
    await Chat.updateOne(
      { _id: chat._id },
      {
        $set: {
          disclaimerAdded: true,
          // Mongoose {timestamps: true} handles 'updatedAt' update automatically
        },
      }
    ).exec();
    // --- END DE-NORMALIZATION FIX ---

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
   * Retrieves paginated chat history for the user's primary chat document by querying the Message collection.
   */
  getChatHistory: async (payload) => {
    const { userID, page, limit, baseUrl } = payload;

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

    const userIdObj = toId(userID);
    const chat = await Chat.findOne({ userID: userIdObj }).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    // --- FIX: Removed .lean({ getters: true }) to ensure decryption getters run on fetch ---
    const chatId = chat._id;
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Use Message model directly for counting and fetching
    const [history, totalItems] = await Promise.all([
      Message.find({ chatId })
        .sort({ timestamp: -1 }) // Latest messages first (DESC)
        .skip(skip)
        .limit(sanitizedLimit)
        .exec(), // Removed .lean({ getters: true })
      Message.countDocuments({ chatId }),
    ]);

    // Convert Mongoose documents to plain objects after decryption has run
    const decryptedHistory = history.map(doc => doc.toObject({ getters: true }));
    
    const totalPages = Math.ceil(totalItems / sanitizedLimit);
    // --- END FIX ---

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        history: decryptedHistory,
        startedAt: chat.createdAt,
        lastActive: chat.updatedAt,
        // --- FIX: Nest pagination inside the 'data' object ---
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
        // --- END FIX ---
      },
    };
  },

  /**
   * Retrieves paginated chat history for a specific session by ID by querying the Message collection.
   */
  getChatById: async (payload) => {
    const { chatId, page, limit, baseUrl } = payload;
    if (!chatId) throw new Error(ERRORS.CHAT_ID_REQUIRED);

    const { page: sanitizedPage, limit: sanitizedLimit } =
      sanitizePaginationParams(page, limit);

    const chat = await Chat.findById(chatId).exec();
    if (!chat) throw new Error(ERRORS.CHAT_NOT_FOUND);

    // --- FIX: Removed .lean({ getters: true }) to ensure decryption getters run on fetch ---
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Use Message model directly for counting and fetching
    const [history, totalItems] = await Promise.all([
      Message.find({ chatId: chat._id })
        .sort({ timestamp: -1 }) // Latest messages first (DESC)
        .skip(skip)
        .limit(sanitizedLimit)
        .exec(), // Removed .lean({ getters: true })
      Message.countDocuments({ chatId: chat._id }),
    ]);

    // Convert Mongoose documents to plain objects after decryption has run
    const decryptedHistory = history.map(doc => doc.toObject({ getters: true }));

    const totalPages = Math.ceil(totalItems / sanitizedLimit);
    // --- END FIX ---

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        chatId: chat._id.toString(),
        userID: chat.userID,
        history: decryptedHistory,
        startedAt: chat.createdAt,
        lastActive: chat.updatedAt,
        // --- FIX: Nest pagination inside the 'data' object ---
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
        // --- END FIX ---
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

    // --- DE-NORMALIZATION FIX: Delete all associated Message documents ---
    await Message.deleteMany({ chatId: chat._id }).exec();
    
    // Reset disclaimerAdded status on the Chat document
    await Chat.updateOne(
        { _id: chat._id },
        { $set: { disclaimerAdded: false } }
    ).exec();
    // --- END DE-NORMALIZATION FIX ---

    return { status: STATUS.SUCCESS, message: 'Conversation cleared' };
  },

  /**
   * Deletes the user's primary chat document and all associated messages, ending the session.
   */
  endChat: async (payload) => {
    const { userID } = payload;

    const chat = await Chat.findOne({ userID: toId(userID) }).exec();
    if (chat) {
        // --- DE-NORMALIZATION FIX ---
        // 1. Delete all associated messages
        await Message.deleteMany({ chatId: chat._id }).exec();
        // 2. Delete the Chat document itself
        await Chat.deleteOne({ _id: chat._id }).exec();
        // --- END DE-NORMALIZATION FIX ---
    }

    return {
      status: STATUS.SUCCESS,
      message: 'Conversation ended. Take care.',
    };
  },
};
