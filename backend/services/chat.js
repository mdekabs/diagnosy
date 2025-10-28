import { Chat } from "../models/chat.js";
import { GeminiService } from "./gemini.js";
import mongoose from "mongoose";
import { logger } from '../config/index.js';

const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";

const MSG_NO_INPUT = "Please share how you're feeling or what's on your mind.";
const MSG_CHAT_NOT_FOUND = "No active conversation found. Start by sharing your feelings.";
const MSG_RESPONSE_SUCCESS = "I'm here to listen and support you.";
const MSG_HISTORY_RETRIEVED = "Conversation history retrieved.";

const DISCLAIMER = "I'm not a therapist or doctor, but i can help you give you first aid before you see a doctor. For crisis or suicidal thoughts, please contact +234 800 2255 6362 for proper direction.";
const REFUSAL_MESSAGE = "I specialize in stress, anxiety, and emotional well-being. Please share how you're feeling.";
const CRISIS_RESPONSE = "I'm really concerned about what you just shared. **Please reach out for immediate help**: Call +234 800 2255 6362 to direct you to nearest help available. You're not alone.";

export class ChatService {
    // Classify if query is about mental health / stress
    static async classifyMentalHealthQuery(query) {
        const prompt = `
Is this message about mental health, stress, anxiety, depression, burnout, mood, sleep issues due to stress, emotional struggles, or coping with life challenges?
Ignore physical medical symptoms unless clearly tied to stress (e.g., "stress headaches").

Respond with ONLY 'YES' or 'NO'.

Message: "${query}"
        `.trim();

        const messages = [{ role: "user", content: prompt }];

        try {
            const result = await GeminiService.generateResponse(messages);
            return result.trim().toUpperCase() === 'YES';
        } catch (error) {
            logger.error(`classifyMentalHealthQuery: ${error.message}`);
            return false;
        }
    }

    // Detect crisis keywords or intent
    static async detectCrisis(message) {
        const crisisPrompt = `
Does this message express suicidal thoughts, self-harm, intent to hurt oneself, or feeling completely hopeless with no way out?
Look for phrases like: "want to die", "end it", "can't go on", "kill myself", "no point", etc.

Respond with ONLY 'CRISIS' or 'SAFE'.

Message: "${message}"
        `.trim();

        const messages = [{ role: "user", content: crisisPrompt }];

        try {
            const result = await GeminiService.generateResponse(messages);
            return result.trim().toUpperCase() === 'CRISIS';
        } catch (error) {
            logger.warn(`Crisis detection failed: ${error.message}`);
            return false;
        }
    }

    // Contextual relevance for follow-ups
    static async isRelevantFollowUp(userMessage, history) {
        if (history.length === 0) return await ChatService.classifyMentalHealthQuery(userMessage);

        const recent = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
        const prompt = `
Conversation so far (mental health context):
${recent}

New message: "${userMessage}"

Is this a natural continuation of a mental health or stress-related discussion?
Examples: asking for coping tips, clarifying feelings, sharing progress, etc.

Respond with ONLY 'YES' or 'NO'.
        `.trim();

        const messages = [{ role: "user", content: prompt }];

        try {
            const result = await GeminiService.generateResponse(messages);
            return result.trim().toUpperCase() === 'YES';
        } catch (error) {
            logger.warn(`Follow-up classification failed: ${error.message}`);
            return history.some(m => m.role === 'user'); // lean toward allowing
        }
    }

    // Start new mental health conversation
    static async createChat(userID, message) {
        if (!message?.trim()) {
            throw new Error(MSG_NO_INPUT);
        }

        const isMentalHealth = await ChatService.classifyMentalHealthQuery(message);
        if (!isMentalHealth) {
            logger.info(`Blocked non-mental-health input: "${message}"`);
            throw new Error(REFUSAL_MESSAGE);
        }

        const isCrisis = await ChatService.detectCrisis(message);
        if (isCrisis) {
            logger.warn(`CRISIS detected in createChat for user ${userID}`);
            return {
                status: STATUS_SUCCESS,
                message: "Urgent support triggered.",
                data: {
                    advice: CRISIS_RESPONSE,
                    isCrisis: true,
                }
            };
        }

        let chatDoc = await Chat.findOne({ userID: new mongoose.Types.ObjectId(userID) });
        if (!chatDoc) {
            chatDoc = await Chat.create({
                userID: new mongoose.Types.ObjectId(userID),
                history: [],
                startedAt: new Date(),
                disclaimerAdded: false,
                topic: "stress" // can be enhanced later
            });
        }

        const history = [...chatDoc.history];

        const systemPrompt = `
You are a compassionate, non-judgmental mental health support assistant.
- Specialize in stress, anxiety, low mood, burnout, and emotional coping.
- Validate feelings: "It's okay to feel this way", "You're not alone".
- Offer practical, evidence-based tips: breathing, grounding, journaling, etc.
- NEVER diagnose, prescribe, or replace therapy.
- If user seems in crisis, respond with: "${CRISIS_RESPONSE}"
- Include the disclaimer exactly ONCE per conversation.
`.trim();

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        let aiResponse;
        try {
            aiResponse = await GeminiService.generateResponse(messages);
        } catch (error) {
            logger.error(`createChat Gemini error: ${error.message}`);
            throw new Error("I couldn't respond right now. Please try again.");
        }

        // Auto-detect crisis in AI response too
        const responseIsCrisis = await ChatService.detectCrisis(aiResponse);
        if (responseIsCrisis) {
            aiResponse = CRISIS_RESPONSE;
        }

        const finalResponse = chatDoc.disclaimerAdded
            ? aiResponse
            : `${aiResponse}\n\n_${DISCLAIMER}_`;

        const updatedHistory = [
            ...history,
            { role: "user", content: message },
            { role: "assistant", content: aiResponse }
        ];

        await Chat.updateOne(
            { _id: chatDoc._id },
            {
                $set: {
                    history: updatedHistory,
                    disclaimerAdded: true,
                    lastActive: new Date()
                }
            }
        );

        return {
            status: STATUS_SUCCESS,
            message: MSG_RESPONSE_SUCCESS,
            data: {
                advice: finalResponse,
                isNewSession: history.length === 0,
                isCrisis: responseIsCrisis
            }
        };
    }

    // Continue ongoing mental health conversation
    static async continueChat(userID, message) {
        if (!message?.trim()) {
            throw new Error(MSG_NO_INPUT);
        }

        const chatDoc = await Chat.findOne({ userID: new mongoose.Types.ObjectId(userID) });
        if (!chatDoc || chatDoc.history.length === 0) {
            throw new Error(MSG_CHAT_NOT_FOUND);
        }

        const isRelevant = await ChatService.isRelevantFollowUp(message, chatDoc.history);
        if (!isRelevant) {
            throw new Error(REFUSAL_MESSAGE);
        }

        const isCrisis = await ChatService.detectCrisis(message);
        if (isCrisis) {
            logger.warn(`CRISIS in continueChat: user ${userID}`);
            return {
                status: STATUS_SUCCESS,
                data: {
                    advice: CRISIS_RESPONSE,
                    isCrisis: true
                }
            };
        }

        const messages = [
            {
                role: "system",
                content: `Continue as a warm, supportive mental health companion.
                Use conversation history. Do not repeat disclaimer.
                If crisis detected, respond: "${CRISIS_RESPONSE}"`
            },
            ...chatDoc.history,
            { role: "user", content: message }
        ];

        let aiResponse;
        try {
            aiResponse = await GeminiService.generateResponse(messages);
        } catch (error) {
            logger.error(`continueChat error: ${error.message}`);
            throw new Error("I'm having trouble responding. Please try again.");
        }

        const responseIsCrisis = await ChatService.detectCrisis(aiResponse);
        if (responseIsCrisis) {
            aiResponse = CRISIS_RESPONSE;
        }

        const updatedHistory = [
            ...chatDoc.history,
            { role: "user", content: message },
            { role: "assistant", content: aiResponse }
        ];

        await Chat.updateOne(
            { _id: chatDoc._id },
            {
                $set: {
                    history: updatedHistory,
                    lastActive: new Date()
                }
            }
        );

        return {
            status: STATUS_SUCCESS,
            message: MSG_RESPONSE_SUCCESS,
            data: {
                advice: aiResponse,
                isContinued: true,
                isCrisis: responseIsCrisis
            }
        };
    }

    // Get conversation history
    static async getChatHistory(userID) {
        const chatDoc = await Chat.findOne({ userID: new mongoose.Types.ObjectId(userID) }).lean();
        if (!chatDoc) {
            throw new Error(MSG_CHAT_NOT_FOUND);
        }

        return {
            status: STATUS_SUCCESS,
            message: MSG_HISTORY_RETRIEVED,
            data: {
                history: chatDoc.history,
                startedAt: chatDoc.startedAt,
                lastActive: chatDoc.lastActive
            }
        };
    }

    // Optional: End session
    static async endChat(userID) {
        const result = await Chat.deleteOne({ userID: new mongoose.Types.ObjectId(userID) });
        return {
            status: STATUS_SUCCESS,
            message: "Conversation ended. Take care — I'm here if you need support again."
        };
    }
}
