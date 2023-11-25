import readlineSync from 'readline-sync';
import colors from 'colors';
import OpenaiService from '../services/OpenaiService.js';

class ChatController {
	constructor() {
		this.chatHistory = [];
	}

	async handleChat() {
		console.log(color.bold.green(
			"welcome to Diagnosy! My name is Daisy. How are you feeling today?"
		)
		);

		const systemMessage = "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that";

		this.chatHistory.push(["system", systemMessage]);

		while (true) {
			const userInput = readlineSync.question(colors.red("You: "));
			try {
				const messages = this.chatHistory.map(([role, content]) => ({
					role,
					content
				}));
				messages.push({ role: "user", content: userInput });
				const completionText = await OpenaiServices.getChatbotCompletion(messages);
				if (this.shouldExit(userInput)) {
					console.log(colors.green("Daisy: Exiting chat. Goodbye!"));
					await OpenaiService.saveChatHistory(this.chatHistory);
					return;
				}

				console.log(colors.green("Daisy ") + completionText);
				this.chatHistory.push(["user", userInput]);
				this.chatHistory.push(["assistant", completionText]);
			}
			catch (error) {
				console.error(colors.red(error));
			}
		}
	}
	shouldExit(userInput) {
		return userInput.toLowerCase() === "exit";
	}
}

export default ChatController;
