// import openai from "./config/openai.js"; /* import the api key from this file */
import openai from "./config/open_ai.js";
import readlineSync from "readline-sync";
import colors from "colors";


async function main() {
  console.log(
    colors.bold.green(
      "Welcome to diagnosy! My name is Daisy. How are you feeling today"
    )
  );

  const system_message = "You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that?"
  const chatHistory = [ ["system", system_message] ];

  while (true) {
    const userInput = readlineSync.question(colors.yellow("You: "));

    try {
      const messages = chatHistory.map(([role, content]) => ({
        role,
        content,
      }));

      messages.push({ role: "user", content: userInput });

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
      });

      const completionText = completion.choices[0].message.content;
      if (userInput.toLowerCase() === "exit") {
        console.log(colors.green("Daisy: ") + completionText);
        return;
      }

      console.log(colors.green("Daisy ") + completionText);
      chatHistory.push(["user", userInput]);
      chatHistory.push(["assistant", completionText]);
    } catch (error) {
      console.error(colors.red(error));
    }
  }
}
main();
