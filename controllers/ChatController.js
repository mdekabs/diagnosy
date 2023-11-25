import readlineSync from 'readline-sync';
import colors from 'colors';
import OpenaiService from '../services/OpenaiService.js';
import dbClient from '../storage/db.js';

class ChatController {
	static async createChat(request, response) {
		// console.log("here")
		const {message, userID} = request.body;
		try {
			/* i want to validate user and get chat history */
			const chatHistory = await createChatHistory(userID, message);
			const aiResponse = await OpenaiService.getChatbotCompletion(chatHistory);
			chatHistory.push(["assistant", aiResponse]);
			await dbClient.saveChatHistory(userID, chatHistory);
			response.status(200).json({
				status: "successful",
				message: "chat is created and saved",
				data: { chatHistory, aiResponse },
			});
		}
		catch (error) {
			console.error("error creatin chat:", error);
			response.status(500);
		};
	}
	static async createChatHistory(userID, userMessage) {
		try {
			/* fetch user */
			const user = await dbclient.fetchUserByID(userID);
			if (!user) {
				throw new Error("user not found");
			}
			/* initialize a chat or get existing chat history */
			let chatHistory = user.chatHistory || [];
			const systemMessage = 
				"Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that?";
			if (chatHistory.length === 0) {
				chatHistory.push(["system", systemMessage]);
			}

			/* add user message to chat history */
			chatHistory.push(["user", userMessage]);
			return chatHistory;
		}
		catch (error) {
			console.error("error creating chathistory:", error);
			return error;
		}
	}
}
export default ChatController;
