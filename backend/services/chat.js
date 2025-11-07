import { Chat } from "../models/chat.js";
import { GeminiService } from "./gemini.js";
import { logger } from "../config/index.js";
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
} from "../utils/chat_helpers.js";
import { sanitizePaginationParams, generatePaginationLinks } from "../utils/pagination.js";

/**
 * ChatService
 * -----------------
 * Handles chat creation, continuation, finalization, and retrieval
 * for the mental health companion feature.
 */
export class ChatService {
  /**
   * Create a new chat session and stream an AI response.
   */
  static async createChat(userID, message) {
    if (!message?.trim()) throw new Error(M.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    // Quick filters
    if (isBlocked(input)) throw new Error(M.REFUSAL);
    if (isCrisis(input)) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
      };
    }

    // Step 1: classify the message
    try {
      const classificationPrompt = CLASSIFICATION_PROMPT(input);
      const classificationRaw = await GeminiService.generateResponseNonStream([
        { role: "user", content: classificationPrompt },
      ]);
      const classification = classificationRaw.toUpperCase().trim();

      if (classification.includes("OFF_TOPIC")) throw new Error(M.REFUSAL);
      if (classification.includes("CRISIS")) {
        return {
          status: STATUS.SUCCESS,
          data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
        };
      }
    } catch (err) {
      logger.error(`Classification error: ${err.message}`);
      // continue safely
    }

    // Step 2: stream AI response
    const chatPrompt = CHAT_PROMPT(input);
    const stream = await GeminiService.generateResponseStream([
      { role: "user", content: chatPrompt },
    ]);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, isNewSession: true, chatId: null },
    };
  }

  /**
   * Continue an existing chat session and stream a response.
   */
  static async continueChat(userID, message) {
    if (!message?.trim()) throw new Error(M.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    if (isBlocked(input)) throw new Error(M.REFUSAL);
    if (isCrisis(input)) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: true },
      };
    }

    const chat = await Chat.findOne({ userID: userIdObj });
    if (!chat || chat.history.length === 0) throw new Error(M.CHAT_NOT_FOUND);

    // Prepare context (decrypt using getters)
    const context = chat.getDecryptedHistory().slice(-10);
    const contextPrompt = context.map((m) => `${m.role}: ${m.content}`).join(" | ");

    const promptText = CONTINUE_PROMPT(contextPrompt, input);
    const messages = [
      ...context.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      })),
      { role: "user", content: input },
    ];

    const stream = await GeminiService.generateResponseStream(messages);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, chatId: chat._id },
    };
  }

  /**
   * Finalize the response: append both user and assistant messages to DB.
   */
  static async finalizeResponse({ userID, input, aiResponse, chatId }) {
    const userIdObj = toId(userID);
    const chat = chatId
      ? await Chat.findById(chatId)
      : await Chat.findOrCreate(userIdObj);

    if (!chat) throw new Error("Chat not found or DB error.");

    // Crisis handling
    let finalResponse = aiResponse;
    if (isCrisis(aiResponse)) {
      finalResponse = CRISIS_RESPONSE;
    }

    // Append disclaimer once per session
    const disclaimerNote = !chat.disclaimerAdded ? `\n\n_${DISCLAIMER}_` : "";
    const fullResponse = `${finalResponse}${disclaimerNote}`;

    // Save both user and assistant turns (encrypted automatically via setter)
    await chat.addMessage("user", input);
    await chat.addMessage("assistant", fullResponse);

    // Mark disclaimer added
    chat.disclaimerAdded = true;
    chat.lastActive = new Date();
    await chat.save();

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
  }

  /**
   * Retrieve decrypted chat history for a user with database-level pagination and HATEOAS.
   */
  static async getChatHistory(userID, page, limit, baseUrl) {
    const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePaginationParams(page, limit);
    const userIdObj = toId(userID);

    // Step 1: Get total items count
    const chat = await Chat.findOne({ userID: userIdObj });
    if (!chat) throw new Error(M.CHAT_NOT_FOUND);
    const totalItems = chat.history.length;

    // Step 2: Aggregate to paginate history array
    const pipeline = [
      { $match: { userID: userIdObj } },
      { $unwind: "$history" },
      { $sort: { "history.timestamp": -1 } }, // Ensure sorting by timestamp
      { $skip: (sanitizedPage - 1) * sanitizedLimit },
      { $limit: sanitizedLimit },
      {
        $project: {
          role: "$history.role",
          content: "$history.content",
          timestamp: "$history.timestamp",
        },
      },
    ];

    const paginatedHistory = await Chat.aggregate(pipeline).option({ getters: true });

    // Step 3: Decrypt history using Mongoose getters
    // Since toJSON: { getters: true } is set, content is automatically decrypted
    const decryptedHistory = paginatedHistory.map((msg) => ({
      role: msg.role,
      content: msg.content, // Decrypted by getter
      timestamp: msg.timestamp,
    }));

    // Step 4: Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / sanitizedLimit);

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        history: decryptedHistory,
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
  }

  /**
   * Retrieve a specific chat by chatId (decrypted) with database-level pagination and HATEOAS.
   */
  static async getChatById(chatId, page, limit, baseUrl) {
    if (!chatId) throw new Error("Chat ID is required.");

    const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePaginationParams(page, limit);

    // Step 1: Get total items count
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error(M.CHAT_NOT_FOUND);
    const totalItems = chat.history.length;

    // Step 2: Aggregate to paginate history array
    const pipeline = [
      { $match: { _id: toId(chatId) } },
      { $unwind: "$history" },
      { $sort: { "history.timestamp": -1 } }, // Ensure sorting by timestamp
      { $skip: (sanitizedPage - 1) * sanitizedLimit },
      { $limit: sanitizedLimit },
      {
        $project: {
          role: "$history.role",
          content: "$history.content",
          timestamp: "$history.timestamp",
        },
      },
    ];

    const paginatedHistory = await Chat.aggregate(pipeline).option({ getters: true });

    // Step 3: Decrypt history using Mongoose getters
    // Since toJSON: { getters: true } is set, content is automatically decrypted
    const decryptedHistory = paginatedHistory.map((msg) => ({
      role: msg.role,
      content: msg.content, // Decrypted by getter
      timestamp: msg.timestamp,
    }));

    // Step 4: Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / sanitizedLimit);

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        chatId: chat._id,
        userID: chat.userID,
        history: decryptedHistory,
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
  }

  /**
   * Clear all messages but keep the chat document.
   */
  static async clearChat(userID) {
    const chat = await Chat.findOne({ userID: toId(userID) });
    if (!chat) throw new Error(M.CHAT_NOT_FOUND);

    chat.history = [];
    chat.disclaimerAdded = false;
    await chat.save();

    return { status: STATUS.SUCCESS, message: "Conversation cleared." };
  }

  /**
   * End (delete) a user’s chat session completely.
   */
  static async endChat(userID) {
    await Chat.deleteOne({ userID: toId(userID) });
    return {
      status: STATUS.SUCCESS,
      message: "Conversation ended. Take care.",
    };
  }
}
