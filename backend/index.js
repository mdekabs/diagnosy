import readlineSync from "readline-sync";
import colors from "colors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw Error("OPENAI key missing");
}

const openai = new OpenAI({ apiKey: apiKey });

async function main() {
  console.log(
    colors.bold.green(
      "Welcome to diagnosy! My name is Daisy. How are you feeling today"
    )
  );

  const system_message =
    "You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that?";
  const chatHistory = [{role: "system", content: "system_message"}];

  while (true) {
    const userInput = readlineSync.question(colors.yellow("You: "));
    try {
    //   const messages = chatHistory.map(([role, content]) => ({
    //     role,
    //     content,
    //   }));

      const messages = chatHistory
      
      messages.push({ role: "user", content: userInput });
      console.log(messages);

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
      chatHistory.push({role: "user", content: userInput});
      chatHistory.push({role: "assistant", content: completionText});
    } catch (error) {
      console.error(colors.red(error));
    }
  }
}
main();
