import OpenAI from "openai";
import { logger } from "../config/logger.js";

// Initialize OpenAI client with Gemini API configuration
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Service for generating responses using the Gemini API
export class GeminiService {
  // Generates a response from the Gemini API using streaming
  // Takes an array of messages and returns the full response as a string
  static async generateResponse(messages) {
    if (!process.env.GEMINI_API_KEY) {
      const errMsg = "GeminiService: GEMINI_API_KEY is not set in environment variables.";
      logger.error(errMsg);
      throw new Error(errMsg);
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gemini-2.0-flash",
        messages,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
        }
      }

      if (!fullResponse) {
        const errMsg = "GeminiService: No content received from Gemini API stream.";
        logger.error(errMsg);
        throw new Error(errMsg);
      }

      logger.info("GeminiService: Response generated successfully.");
      return fullResponse;
    } catch (error) {
      logger.error(`GeminiService: Error generating response: ${error.message}`);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}
