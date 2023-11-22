import openai from "./config/openai.js"; /* import the api key from this file */
import readlineSync from "readline-sync";
import colors from "colors"; 

async function main() {
        console.log(color.bold.green("Welcome to diagnosy! My name is Daisy. How are you feeling today"));

        const chatHistory = [];

        while (true) {
                const userInput = readlineSync.question(color.yellow("You: "));

                try {
                        const messages = chatHistory.map(([role, content]) => ({
                                role,
                                content
                        }));

                        messages.push({ role: "user", content: userInput });

                        const completion = await openai.createChatCompletion({
                                model: "gpt-3.5-turbo",
                                messages: messages
                        });

                        const completionText = completion.data.choices[0].message.content;
                        if (userInput.toLowerCase() === "exit") {
                                console.log(colors.green("Daisy: ") + completionText);
                                return;
                        }

                        console.log(colors.green("Daisy ") + completionText);
                        chatHistory.push(["user", userInput]);
                        cahstHistory.push(["assistant", completionText]);
                }
                catch(error) {
                console.error(colors.red(error));
                }
        }
}
main();
