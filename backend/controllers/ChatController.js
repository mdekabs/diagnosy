import readlineSync from 'readline-sync';
import colors from 'colors';
import OpenaiService from '../services/OpenaiService.js';
import dbClient from '../storage/db.js';
import redisClient from '../storage/redis.js';

class ChatController {
	static async createChat(request, response) {
		const { symptom } = request.body;
    const token = request.headers['auth-token'];
		if (!token) {
			response.status(401).json({
				status: "error",
				message: "Unauthorized! auth-token required",
				data: null,
			  })
		}

    const key = `auth_${token}`;
		const userID = await redisClient.get(key);
    if (!userID) {
      response.status(401).json({
				status: "error",
				message: "Unauthorized! invalid token",
				data: null,
			  })
    }
    const user = await dbClient.fetchUserByID(userID)
		if (!user) {
			response.status(404).json({
				status: "error",
				message: "User not found",
				data: null,
			  });
		}

    if (!symptom) {
      response.status(400).json({
				status: "error",
				message: "Symptom is required",
				data: null,
			  })
    }

    const chats = await dbClient.fetchUserChat(userID);
    const chatHistory = chats.history;
  
    let completionText;
    try {
      chatHistory.push({ role: "user", content: symptom });
      completionText = await OpenaiService.getChatbotCompletion(chatHistory);
      chatHistory.push({role: "assistant", content: completionText});
      await dbClient.updateChatHistory(chats._id, chatHistory);
    } catch(error) {
      console.log(error);
      response.status(504).json({
        status: "error",
        message: error.message,
        data: null,
      })
    }

    response.status(200).json({
      status: "success",
      message: "Response generated successfully!",
      data: {
        advice: completionText
      }
    });
	}
  
  static async getChatHistory(request, response) {
    const token = request.headers['auth-token'];
    
    if (!token) {
			response.status(401).json({
				status: "error",
				message: "Unauthorized! auth-token required",
				data: null,
			  })
		}

    const key = `auth_${token}`;
		const userID = await redisClient.get(key);
    if (!userID) {
      response.status(401).json({
				status: "error",
				message: "Unauthorized! invalid token",
				data: null,
			  })
    }
    const user = await dbClient.fetchUserByID(userID)
		if (!user) {
			response.status(404).json({
				status: "error",
				message: "User not found",
				data: null,
			  });
		}

    try {
      const chats = await dbClient.fetchUserChat(userID);
      response.status(200).json({
        status: "success",
        message: "Chat history retrieved successfully!",
        data: { chats }
      })
    } catch(error) {
      console.log(error);
      response.status(504).json({
        status: "error",
        message: error.message,
        data: null,
      })
    }

  }
}

export default ChatController;
