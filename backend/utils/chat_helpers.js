import mongoose from "mongoose";

// ────── Constants ──────
export const STATUS = { SUCCESS: "success" };

export const M = {
  NO_INPUT: "Please share how you're feeling or what's on your mind.",
  CHAT_NOT_FOUND: "No active conversation found. Start by sharing your feelings.",
  RESPONSE_SUCCESS: "I'm here to listen and support you.",
  REFUSAL:
    "I specialize in stress, anxiety, and emotional well-being. Please share how you're feeling.",
};

export const DISCLAIMER =
  "I'm not a therapist or doctor, but I can help give you first aid before you see a doctor. For crisis or suicidal thoughts, please contact +234 800 2255 6362 for proper direction.";

export const CRISIS_RESPONSE =
  "I'm really concerned about what you just shared. **Please reach out for immediate help**: Call +234 800 2255 6362 to direct you to nearest help available. You're not alone.";

const CRISIS_KEYWORDS = [
  /kill myself/i,
  /end it/i,
  /no point living/i,
  /want to die/i,
  /suicide/i,
];

const BLOCKED_PHRASES = [
  /weather/i,
  /stock price/i,
  /recipe/i,
  /joke/i,
  /math/i,
  /code/i,
];

// ────── Prompts ──────
export const CLASSIFICATION_PROMPT = (input) => `
Analyze the user's message below and respond with only one of these three tags, no other text: [OFF_TOPIC|CRISIS|SAFE].
OFF_TOPIC: The message is a general knowledge question or blocked phrase.
CRISIS: The message expresses self-harm or suicidal intent.
SAFE: The message is related to mental health, anxiety, or general well-being.
User Message: "${input}"
`.trim();

export const CHAT_PROMPT = (input) => `
You are a warm, supportive mental wellness companion.
- Your response must be under 150 words.
- Do not include the disclaimer in your response; it will be added by the system.
- User input: "${input}"
`.trim();

export const CONTINUE_PROMPT = (recentHistory, input) => `
Continue this mental health chat. Be warm, practical, and limit your response to 120 words.
Previous Context (Role: Content | ...): ${recentHistory}
Crisis Response: "${CRISIS_RESPONSE}"

User: "${input}"
`.trim();

// ────── Helpers ──────
export const toId = (id) => new mongoose.Types.ObjectId(id);
export const isCrisis = (msg) => CRISIS_KEYWORDS.some((r) => r.test(msg));
export const isBlocked = (msg) => BLOCKED_PHRASES.some((r) => r.test(msg));

