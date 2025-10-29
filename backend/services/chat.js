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

/**
 * ChatService
 * -----------------
 * Handles chat creation, continuation, finalization, and retrieval
 * for the mental health companion feature. Integrates with GeminiService
 * for AI responses and MongoDB for session persistence.
 */
export class ChatService {
  /**
   * Create a new chat session and stream an AI response.
   * Performs input validation, topic classification, and crisis detection.
   * @param {string} userID - MongoDB user ID.
   * @param {string} message - User input message.
   * @returns {Promise<object>} Stream object and metadata for real-time consumption.
   */
  static async createChat(userID, message) {
    if (!message?.trim()) throw new Error(M.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    // Quick local checks
    if (isBlocked(input)) throw new Error(M.REFUSAL);
    if (isCrisis(input)) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
      };
    }

    // Step 1: AI classification (non-streaming)
    try {
      const classificationPrompt = CLASSIFICATION_PROMPT(input);
      const classificationMessages = [{ role: "user", content: classificationPrompt }];
      const classificationRaw = await GeminiService.generateResponseNonStream(classificationMessages);
      const classification = classificationRaw.toUpperCase().trim();

      if (classification.includes("OFF_TOPIC")) throw new Error(M.REFUSAL);
      if (classification.includes("CRISIS")) {
        return {
          status: STATUS.SUCCESS,
          data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false },
        };
      }
    } catch (err) {
      logger.error(`ChatService.createChat classification error: ${err.message}`);
      // fallback: continue as safe
    }

    // Step 2: Generate AI response (streaming)
    const chatPrompt = CHAT_PROMPT(input);
    const streamingMessages = [{ role: "user", content: chatPrompt }];
    const stream = await GeminiService.generateResponseStream(streamingMessages);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, isNewSession: true, chatId: null },
    };
  }

  /**
   * Continue an existing chat session and stream a response.
   * Rebuilds context from previous messages and performs validation.
   * @param {string} userID - MongoDB user ID.
   * @param {string} message - User’s new message.
   * @returns {Promise<object>} Stream object and metadata.
   */
  static async continueChat(userID, message) {
    if (!message?.trim()) throw new Error(M.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    // Quick local checks
    if (isBlocked(input)) throw new Error(M.REFUSAL);
    if (isCrisis(input)) {
      return {
        status: STATUS.SUCCESS,
        data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: true },
      };
    }

    const chat = await Chat.findOne({ userID: userIdObj });
    if (!chat || chat.history.length === 0) throw new Error(M.CHAT_NOT_FOUND);

    // Prepare chat history context (up to 10 most recent turns)
    const recentHistoryForAPI = chat.history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      content: m.content,
    }));

    // Prepare combined context prompt
    const recentHistoryForPrompt = recentHistoryForAPI
      .map((m) => `${m.role}: ${m.content}`)
      .join(" | ");
    const promptText = CONTINUE_PROMPT(recentHistoryForPrompt, input);

    // Build full message array (for Gemini)
    const fullContents = [
      ...recentHistoryForAPI,
      { role: "user", content: input },
    ];

    const stream = await GeminiService.generateResponseStream(fullContents);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, chatId: chat._id },
    };
  }

  /**
   * Finalize an AI response after streaming ends.
   * Updates chat history, appends disclaimers, and handles crisis escalation.
   * @param {object} params - { userID, input, aiResponse, chatId }
   * @returns {Promise<object>} Finalized response with metadata.
   */
  static async finalizeResponse({ userID, input, aiResponse, chatId }) {
    const userIdObj = toId(userID);

    // Find or create chat
    let chat;
    if (chatId) {
      chat = await Chat.findById(chatId);
    } else {
      chat = await Chat.findOneAndUpdate(
        { userID: userIdObj },
        {
          $setOnInsert: {
            userID: userIdObj,
            startedAt: new Date(),
            disclaimerAdded: false,
          },
        },
        { new: true, upsert: true, runValidators: true }
      );
    }

    if (!chat) throw new Error("Could not finalize chat session: DB error.");

    const isNewSession = chat.history.length === 0;
    let finalAiResponse = aiResponse;

    if (isCrisis(aiResponse)) {
      finalAiResponse = CRISIS_RESPONSE;
    }

    const finalResponseForClient = chat.disclaimerAdded
      ? finalAiResponse
      : `${finalAiResponse}\n\n_${DISCLAIMER}_`;

    const isCrisisFinal = finalAiResponse === CRISIS_RESPONSE;

    // Update chat history
    const updatedHistory = [
      ...chat.history,
      { role: "user", content: input, timestamp: new Date() },
      { role: "assistant", content: finalAiResponse, timestamp: new Date() },
    ];

    await Chat.findByIdAndUpdate(chat._id, {
      $set: {
        history: updatedHistory,
        disclaimerAdded: true,
        lastActive: new Date(),
      },
    });

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        advice: finalResponseForClient,
        isNewSession,
        isContinued: !!chatId,
        isCrisis: isCrisisFinal,
      },
    };
  }

  /**
   * Retrieve user’s chat history.
   * @param {string} userID - MongoDB user ID.
   * @returns {Promise<object>} Full chat record with timestamps.
   */
  static async getChatHistory(userID) {
    const chat = await Chat.findOne({ userID: toId(userID) }).lean();
    if (!chat) throw new Error(M.CHAT_NOT_FOUND);

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        history: chat.history,
        startedAt: chat.startedAt,
        lastActive: chat.lastActive,
      },
    };
  }

  /**
   * End and delete a user’s chat session.
   * @param {string} userID - MongoDB user ID.
   * @returns {Promise<object>} Confirmation message.
   */
  static async endChat(userID) {
    await Chat.deleteOne({ userID: toId(userID) });
    return { status: STATUS.SUCCESS, message: "Conversation ended. Take care." };
  }
}

