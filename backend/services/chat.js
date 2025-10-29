// src/services/chatService.js (Corrected Logic)

import { Chat } from "../models/chat.js";
import { GeminiService } from "./gemini.js";
import mongoose from "mongoose";
import { logger } from "../config/index.js";

// ────── Constants ──────
const STATUS = { SUCCESS: "success" };
const M = {
  NO_INPUT: "Please share how you're feeling or what's on your mind.",
  CHAT_NOT_FOUND: "No active conversation found. Start by sharing your feelings.",
  RESPONSE_SUCCESS: "I'm here to listen and support you.",
  REFUSAL: "I specialize in stress, anxiety, and emotional well-being. Please share how you're feeling.",
};

const DISCLAIMER = "I'm not a therapist or doctor, but I can help give you first aid before you see a doctor. For crisis or suicidal thoughts, please contact +234 800 2255 6362 for proper direction.";
const CRISIS_RESPONSE = "I'm really concerned about what you just shared. **Please reach out for immediate help**: Call +234 800 2255 6362 to direct you to nearest help available. You're not alone.";

const CRISIS_KEYWORDS = [/kill myself/i, /end it/i, /no point living/i, /want to die/i, /suicide/i];
const BLOCKED_PHRASES = [/weather/i, /stock price/i, /recipe/i, /joke/i, /math/i, /code/i];

// ────── Prompt Templates ──────

const CLASSIFICATION_PROMPT = (input) => `
Analyze the user's message below and respond with only one of these three tags, no other text: [OFF_TOPIC|CRISIS|SAFE].
OFF_TOPIC: The message is a general knowledge question or blocked phrase.
CRISIS: The message expresses self-harm or suicidal intent.
SAFE: The message is related to mental health, anxiety, or general well-being.
User Message: "${input}"
`.trim();

const CHAT_PROMPT = (input) => `
You are a warm, supportive mental wellness companion.
- Your response must be under 150 words.
- Do not include the disclaimer in your response; it will be added by the system.
- User input: "${input}"
`.trim();

const CONTINUE_PROMPT = (recentHistory, input) => `
Continue this mental health chat. Be warm, practical, and limit your response to 120 words.
Previous Context (Role: Content | ...): ${recentHistory}
Crisis Response: "${CRISIS_RESPONSE}"

User: "${input}"
`.trim();

// ────── Helpers ──────
const toId = (id) => new mongoose.Types.ObjectId(id);
const isCrisis = (msg) => CRISIS_KEYWORDS.some(r => r.test(msg));
const isBlocked = (msg) => BLOCKED_PHRASES.some(r => r.test(msg));

// ────── Service ──────
export class ChatService {

  // ── CREATE CHAT (Streaming) ──
  static async createChat(userID, message) {
    if (!message?.trim()) throw new Error(M.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    // 1. Hard-coded Checks (Fastest path)
    if (isBlocked(input)) throw new Error(M.REFUSAL);
    if (isCrisis(input)) {
      return { status: STATUS.SUCCESS, data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false } };
    }

    // 2. AI Classification (NON-STREAMING CALL) - Must end with 'user' role
    try {
      const classificationPrompt = CLASSIFICATION_PROMPT(input);
      // FIX: Ensure the messages array for this single-turn non-stream call 
      // is correctly formatted as a USER turn.
      const classificationMessages = [{ role: "user", content: classificationPrompt }];
      const classificationRaw = await GeminiService.generateResponseNonStream(classificationMessages);
      const classification = classificationRaw.toUpperCase().trim();

      if (classification.includes("OFF_TOPIC")) throw new Error(M.REFUSAL);
      if (classification.includes("CRISIS")) {
        // AI detected crisis
        return { status: STATUS.SUCCESS, data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: false } };
      }

    } catch (err) {
      logger.error(`ChatService.createChat classification error: ${err.message}`);
      // Fallback: Treat as SAFE and continue
    }

    // 3. AI Response Generation (STREAMING CALL) - Must end with 'user' role
    const chatPrompt = CHAT_PROMPT(input);
    
    // FIX: Include the system prompt AND the user's input, with user as the last role.
    const streamingMessages = [
        { role: "user", content: chatPrompt }, // The full prompt, treated as the first user message
    ];
    
    const stream = await GeminiService.generateResponseStream(streamingMessages);

    // The handler consuming this stream must call finalizeResponse after streaming ends.
    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, isNewSession: true, chatId: null }
    };
  }

  // ── CONTINUE CHAT (Streaming) ──
  static async continueChat(userID, message) {
    if (!message?.trim()) throw new Error(M.NO_INPUT);
    const input = message.trim();
    const userIdObj = toId(userID);

    // Hard-coded checks
    if (isBlocked(input)) throw new Error(M.REFUSAL);
    if (isCrisis(input)) {
      return { status: STATUS.SUCCESS, data: { advice: CRISIS_RESPONSE, isCrisis: true, isContinued: true } };
    }

    const chat = await Chat.findOne({ userID: userIdObj });
    if (!chat || chat.history.length === 0) throw new Error(M.CHAT_NOT_FOUND);

    // 1. Map history roles and content
    // FIX: Use the full chat history (up to the context limit) and map 'assistant' role to 'model'
    const recentHistoryForAPI = chat.history.slice(-10).map(m => ({ 
        // Ensure roles are 'user' or 'model'
        role: m.role === 'assistant' ? 'model' : 'user', 
        content: m.content
    }));

    // 2. Generate the continue prompt and add the new user message
    const recentHistoryForPrompt = recentHistoryForAPI.map(m => `${m.role}: ${m.content}`).join(" | ");
    const promptText = CONTINUE_PROMPT(recentHistoryForPrompt, input);

    // 3. Construct the final message array
    const streamingMessages = [
        { role: "user", content: promptText }, // The full context prompt, treated as the first user message
        // Note: For multi-turn chats with Gemini, sometimes the system instruction 
        // needs to be included *before* the history. We wrap it in the first user turn for simplicity.
    ];
    
    // For continuing a chat, we need to send the historical turns.
    // The Gemini API requires contents to be an alternating sequence starting with 'user'.
    const fullContents = [
        ...recentHistoryForAPI,
        { role: "user", content: input } // MUST be the last role to prompt a response
    ];
    
    // We will send the full alternating history plus the new prompt.
    // The system prompt logic is now handled implicitly by the overall history context.

    // AI Response Generation (STREAMING CALL)
    const stream = await GeminiService.generateResponseStream(fullContents);

    return {
      status: STATUS.SUCCESS,
      stream,
      metadata: { userID: userIdObj, input, chatId: chat._id }
    };
  }

  // ── FINALIZE (remains unchanged) ──
  static async finalizeResponse({ userID, input, aiResponse, chatId }) {
    const userIdObj = toId(userID);

    // 1. Find or Create Chat
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

    // 2. Response Processing
    let finalAiResponse = aiResponse;
    if (isCrisis(aiResponse)) {
        finalAiResponse = CRISIS_RESPONSE;
    }

    const finalResponseForClient = chat.disclaimerAdded
        ? finalAiResponse
        : `${finalAiResponse}\n\n_${DISCLAIMER}_`;

    const isCrisisFinal = finalAiResponse === CRISIS_RESPONSE;

    // 3. History Update
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
            isNewSession: isNewSession,
            isContinued: !!chatId,
            isCrisis: isCrisisFinal,
        },
    };
  }

  // ── GET HISTORY & END CHAT (remain unchanged) ──
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

  static async endChat(userID) {
    await Chat.deleteOne({ userID: toId(userID) });
    return { status: STATUS.SUCCESS, message: "Conversation ended. Take care." };
  }
}
