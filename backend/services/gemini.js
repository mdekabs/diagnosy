import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export class GeminiService {
  static async generateResponse(messages) {
    if (!process.env.GEMINI_API_KEY) {
      const errMsg = "GeminiService: GEMINI_API_KEY is not set in environment variables.";
      console.error(errMsg);
      throw new Error(errMsg);
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gemini-2.0-flash",
        messages,
      });

      if (!response.choices || !response.choices[0]?.message?.content) {
        const errMsg = "GeminiService: Invalid response format from Gemini API.";
        console.error(errMsg, response);
        throw new Error(errMsg);
      }

      console.info("GeminiService: Response generated successfully.");
      return response.choices[0].message.content;
    } catch (error) {
      console.error("GeminiService: Error generating response:", error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}
