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


  async getChatbotCompletion(messages) {
    console.log(messages);
    // try {
    //   const completion = await this.openai.chat.completions.create({
    //     model: "gpt-3.5-turbo",
    //     messages: messages,
    //   });

    //   return completion.choices[0].message.content;
    // } catch (error) {
    //   console.error("Error interacting with OpenAI");
    //   throw error;
    // }
  }

  async saveChatHistory(chatHistory) {
    try {
      await dbClient.connect();
      const collection = dbClient.db().collection("chatHistory");
      await collection.insertOne({ chatHistory });
      console.log("chat history saved to DB");
    } catch (error) {
      console.error("Error saving chat history");
    }
  }
}

export default new OpenaiService();
