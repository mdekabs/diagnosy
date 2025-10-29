// src/handlers/chatHandler.js

import { ChatService } from '../services/chat.js';
import { logger } from '../config/index.js';

// A utility to send structured messages/errors back to the client
const sendWSMessage = (ws, type, payload) => {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
};

/**
 * Handles an incoming 'chat_message' from a connected WebSocket client.
 * Decides whether to create or continue a session, consumes the stream,
 * and handles session finalization.
 * * @param {WebSocket} ws The active WebSocket connection.
 * @param {object} enrichedPayload The payload enriched by websocketHandler.js
 * @param {string} enrichedPayload.userID The authenticated user ID.
 * @param {boolean} enrichedPayload.isContinued Whether the session is an ongoing chat.
 * @param {string} enrichedPayload.message The user's input message.
 */
export const handleChatMessage = async (ws, enrichedPayload) => {
    const { userID, isContinued, message } = enrichedPayload;
    
    let result;
    try {
        if (isContinued) {
            // Continuation logic (uses existing session)
            result = await ChatService.continueChat(userID, message);
        } else {
            // New session logic (creates a new session)
            result = await ChatService.createChat(userID, message);
        }

    } catch (error) {
        logger.error(`Chat handler service error for user ${userID}: ${error.message}`);
        // If the service throws (e.g., NO_INPUT, REFUSAL, CHAT_NOT_FOUND)
        return sendWSMessage(ws, 'error', { message: error.message });
    }

    // Handle hard-coded/classified responses (CRISIS or REFUSAL)
    if (result.data?.advice) {
        return sendWSMessage(ws, 'chat_response', { 
            advice: result.data.advice,
            isCrisis: result.data.isCrisis || false,
            isContinued: result.data.isContinued || false,
            isStreaming: false 
        });
    }

    // --- STREAM CONSUMPTION AND RESPONSE ---
    
    const { stream, metadata } = result;
    let fullResponse = "";
    
    // Notify the client that streaming is starting
    sendWSMessage(ws, 'chat_response', { 
        isStreaming: true,
        isContinued,
        // Send initial metadata if needed
    });

    try {
        for await (const token of stream) {
            // 1. Accumulate the full response for saving to DB later
            fullResponse += token;
            
            // 2. Send the token chunk to the client
            sendWSMessage(ws, 'chat_token', { token });
        }

        logger.info(`Stream finished for user ${userID}. Finalizing session.`);
        
        // --- FINALIZATION (Saving to Database) ---
        const finalResult = await ChatService.finalizeResponse({
            userID: userID,
            input: message,
            aiResponse: fullResponse,
            chatId: metadata.chatId,
        });

        // 3. Notify the client that the session is complete and history is saved
        sendWSMessage(ws, 'session_complete', {
            message: "Conversation session saved.",
            chatId: finalResult.data.chatId, // Assuming finalizeResponse returns the ID
            isCrisis: finalResult.data.isCrisis,
            isDisclaimer: finalResult.data.advice.includes("I'm not a therapist"),
        });
        
    } catch (streamError) {
        logger.error(`Stream processing or finalization error for user ${userID}: ${streamError.message}`);
        // This is a critical error, likely a failed API request or DB write
        sendWSMessage(ws, 'error', { message: 'A critical error occurred while generating or saving the response.' });
    }
};
