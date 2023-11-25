import readlineSync from 'readline-sync';
import colors from 'colors';
import OpenaiService from '../services/OpenaiService.js';
import dbClient from '../storage/db.js';

class ChatController {
	static async createChat(request, response) {
		// console.log("here")
		const {message, userID} = request.body;
		if (!userID) {
			response.status(400).json({
				status: "error",
				message: "User ID is required",
				data: null,
			  })
		}
		const user = dbClient.fetchUserByID(userID);
		if (!user) {
			response.status(404).json({
				status: "error",
				message: "User not found",
				data: null,
			  });
		}
		console.log(createChatHistory(userID), message)
		// const advice = OpenaiService.getChatbotCompletion()
	}

	static async createChatHistory(userID) {
		const chatHistory = [];
		const systemMessage = "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that";
		chatHistory.push(["system", systemMessage]);
		const chat = {chatHistory, userID}

		return await dbClient.createChat(chat);
	  }

	
}

export default ChatController;
