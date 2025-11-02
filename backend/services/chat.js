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
    const contextPrompt = context
      .map((m) => `${m.role}: ${m.content}`)
      .join(" | ");

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
    const disclaimerNote = !chat.disclaimerAdded
      ? `\n\n_${DISCLAIMER}_`
      : "";
    const fullResponse = `${finalResponse}${disclaimerNote}`;

    // Save both user and assistant turns (encrypted automatically)
    await chat.addMessage("user", input);
    await chat.addMessage("assistant", finalResponse);

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
   * Retrieve decrypted chat history for a user.
   */
  static async getChatHistory(userID) {
    const chat = await Chat.findOne({ userID: toId(userID) });
    if (!chat) throw new Error(M.CHAT_NOT_FOUND);

    const history = chat.getDecryptedHistory();

    return {
      status: STATUS.SUCCESS,
      message: M.RESPONSE_SUCCESS,
      data: {
        history,
        startedAt: chat.createdAt,
        lastActive: chat.updatedAt,
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
