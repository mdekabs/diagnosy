// src/services/gemini.js (Updated with Google Gen AI SDK)

import { GoogleGenAI } from "@google/genai";
import { logger } from "../config/index.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using a standard, available streaming model
const GEMINI_MODEL = "gemini-2.5-flash"; 

if (!GEMINI_API_KEY) {
    logger.error("FATAL: GEMINI_API_KEY is missing. GeminiService cannot initialize.");
    throw new Error("GEMINI_API_KEY missing, service initialization failed.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); 

export class GeminiService {
    
    /**
     * Converts your internal message format ({role: "user/assistant", content: string})
     * to the Gemini API format ({role: "user/model", parts: [{ text: string }]}).
     * @param {Array<Object>} messages - Array of internal message objects.
     * @returns {Array<Object>} Transformed contents array for the Gemini API.
     */
    static transformMessages(messages) {
        return messages.map(msg => ({
            // Map internal 'assistant' to 'model' for the API
            role: msg.role === 'assistant' ? 'model' : msg.role, 
            parts: [{ text: msg.content }]
        }));
    }

    // --- Non-Streaming Call (Used for Classification) ---
    static async generateResponseNonStream(messages) {
        try {
            const transformedMessages = GeminiService.transformMessages(messages);
            
            logger.info("GeminiService sending non-stream contents: " + JSON.stringify(transformedMessages, null, 2)); // 🔍 DEBUG LOG
            
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: transformedMessages,
            });

            const full = response.text;
            if (!full) throw new Error("Empty response from Gemini");

            logger.info("GeminiService: non-stream response generated successfully");
            return full;
        } catch (err) {
            logger.error(`GeminiService.generateResponseNonStream error: ${err.message}`);
            throw new Error(`Gemini API error: ${err.message}`);
        }
    }

    // --- Streaming Call (Used for Chat) ---
    static async *generateResponseStream(messages) {
        try {
            const transformedMessages = GeminiService.transformMessages(messages);
            
            logger.info("GeminiService sending stream contents: " + JSON.stringify(transformedMessages, null, 2)); // 🔍 DEBUG LOG
            
            const responseStream = await ai.models.generateContentStream({
                model: GEMINI_MODEL,
                contents: transformedMessages,
            });

            for await (const chunk of responseStream) {
                const token = chunk.text;
                if (token) yield token;
            }

            logger.info("GeminiService: stream completed successfully");
        } catch (err) {
            logger.error(`GeminiService.generateResponseStream error: ${err.message}`);
            throw err;
        }
    }
}
