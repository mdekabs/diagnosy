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

    const chatHistory = [];
    let completionText;
		const systemMessage = "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that";
		chatHistory.push(["system", systemMessage]);
    try {
      const messages = chatHistory.map(([role, content]) => ({
        role,
        content
      }));
      messages.push({ role: "user", content: symptom });
      completionText = await OpenaiService.getChatbotCompletion(messages);
    } catch(error) {
      console.log(error);
    }

    response.status(200).json({
      status: "success",
      message: "Response generated successfully!",
      data: {
        advice: completionText
      }
    })
	}

	// static async createChatHistory(userID) {
	// 	const chatHistory = [];
	// 	const systemMessage = "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that";
	// 	chatHistory.push(["system", systemMessage]);
	// 	const chat = {chatHistory, userID}

	// 	return await dbClient.createChat(chat);
	//   }

	
}

export default ChatController;
