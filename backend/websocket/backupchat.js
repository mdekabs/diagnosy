import { ChatService } from '../services/chat.js';
import { logger } from '../config/index.js';

/**
 * Sends a structured WebSocket message or error back to the client.
 * @param {WebSocket} ws - The active WebSocket connection.
 * @param {string} type - The message type (e.g., 'chat_response', 'error').
 * @param {object} payload - The message payload.
 */
const sendWSMessage = (ws, type, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
};

/**
 * Handles incoming chat messages from connected WebSocket clients.
 * Determines if it's a new or continued chat, processes the message stream,
 * and finalizes the conversation for storage.
 * @param {WebSocket} ws - The active WebSocket connection.
 * @param {object} enrichedPayload - The enriched message payload.
 * @param {string} enrichedPayload.userID - The authenticated user ID.
 * @param {boolean} enrichedPayload.isContinued - Whether this is an ongoing session.
 * @param {string} enrichedPayload.message - The user’s input message.
 */
export const handleChatMessage = async (ws, enrichedPayload) => {
  const { userID, isContinued, message } = enrichedPayload;
  let result;

  try {
    result = isContinued
      ? await ChatService.continueChat(userID, message)
      : await ChatService.createChat(userID, message);
  } catch (error) {
    logger.error(`Chat service error for user ${userID}: ${error.message}`);
    return sendWSMessage(ws, 'error', { message: error.message });
  }

  // Handle special responses such as crisis or advisory messages
  if (result.data?.advice) {
    return sendWSMessage(ws, 'chat_response', {
      advice: result.data.advice,
      isCrisis: result.data.isCrisis || false,
      isContinued: result.data.isContinued || false,
      isStreaming: false,
    });
  }

  const { stream, metadata } = result;
  let fullResponse = '';

  // Notify client that streaming is starting
  sendWSMessage(ws, 'chat_response', { isStreaming: true, isContinued });

  try {
    for await (const token of stream) {
      fullResponse += token;
      sendWSMessage(ws, 'chat_token', { token });
    }

    logger.info(`Stream completed for user ${userID}. Saving conversation...`);

    // Save finalized AI response
    const finalResult = await ChatService.finalizeResponse({
      userID,
      input: message,
      aiResponse: fullResponse,
      chatId: metadata.chatId,
    });

    sendWSMessage(ws, 'session_complete', {
      message: 'Conversation session saved.',
      chatId: finalResult.data.chatId,
      isCrisis: finalResult.data.isCrisis,
      isDisclaimer: finalResult.data.advice?.includes("I'm not a therapist"),
    });
  } catch (streamError) {
    logger.error(
      `Stream processing or finalization error for user ${userID}: ${streamError.message}`
    );
    sendWSMessage(ws, 'error', {
      message:
        'A critical error occurred while generating or saving the response.',
    });
  }
};

