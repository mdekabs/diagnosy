import dbClient from "../storage/db";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

class OpenaiService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw Error("OPENAI key missing");
    }

    this.openai = new OpenAI({ apiKey: apiKey });
  }


  async getChatbotCompletion(chatHistory) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: chatHistory,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error interacting with OpenAI");
      throw error;
    }
  }
}

export default new OpenaiService();
