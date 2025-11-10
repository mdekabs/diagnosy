import { GoogleGenAI } from '@google/genai';
import { logger } from '../config/index.js';

// --- Constants ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const ERRORS = {
  API_KEY_MISSING: 'GEMINI_API_KEY missing, service initialization failed.',
  EMPTY_RESPONSE: 'Empty response from Gemini',
  API_ERROR: (msg) => `Gemini API error: ${msg}`,
};

// Initialize Google Gen AI
if (!GEMINI_API_KEY) {
  logger.error(`FATAL: ${ERRORS.API_KEY_MISSING}`);
  throw new Error(ERRORS.API_KEY_MISSING);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * GeminiService
 * @description Manages interactions with the Google Gemini AI API for generating non-streaming and streaming responses.
 */
export const GeminiService = {
  /**
   * Converts internal message format ({role: "user/assistant", content: string})
   * to Gemini API format ({role: "user/model", parts: [{ text: string }]}).
   * @param {{role: string, content: string}[]} messages - Array of internal message objects
   * @returns {{role: string, parts: {text: string}[]}[]} Transformed contents array for Gemini API
   */
  transformMessages: (messages) =>
    messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    })),

  /**
   * Generates a non-streaming response from the Gemini API (used for classification)
   * @async
   * @param {{role: string, content: string}[]} messages - Array of message objects
   * @returns {Promise<string>} Generated response text
   * @throws {Error} If the API call fails or response is empty
   */
  generateResponseNonStream: async (messages) => {
    try {
      const transformedMessages = GeminiService.transformMessages(messages);
      logger.debug(`Sending non-stream contents: ${JSON.stringify(transformedMessages, null, 2)}`);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: transformedMessages,
      });

      const text = response.text;
      if (!text) throw new Error(ERRORS.EMPTY_RESPONSE);

      logger.info('Non-stream response generated successfully');
      return text;
    } catch (err) {
      logger.error(`Non-stream error: ${err.message}`);
      throw new Error(ERRORS.API_ERROR(err.message));
    }
  },

  /**
   * Generates a streaming response from the Gemini API (used for chat)
   * @async
   * @param {{role: string, content: string}[]} messages - Array of message objects
   * @returns {AsyncIterable<string>} Stream of response tokens
   * @throws {Error} If the API call fails
   */
  generateResponseStream: async function* (messages) {
    try {
      const transformedMessages = GeminiService.transformMessages(messages);
      logger.debug(`Sending stream contents: ${JSON.stringify(transformedMessages, null, 2)}`);

      const responseStream = await ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: transformedMessages,
      });

      for await (const chunk of responseStream) {
        const token = chunk.text;
        if (token) yield token;
      }

      logger.info('Stream completed successfully');
    } catch (err) {
      logger.error(`Stream error: ${err.message}`);
      throw new Error(ERRORS.API_ERROR(err.message));
    }
  },
};
