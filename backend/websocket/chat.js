import { ChatService } from '../services/chat.js';
import { logger } from '../config/index.js';

/**
 * Sends a structured WebSocket message to the client.
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
 * Processes incoming chat messages over WebSocket, streams AI responses,
 * and finalizes conversation sessions.
 * @param {WebSocket} ws - The active WebSocket connection.
 * @param {object} enrichedPayload - Enriched incoming chat payload.
 */
export const handleChatMessage = async (ws, enrichedPayload) => {
  const { userID, message, chatId, isContinued } = enrichedPayload;
  let result;

  try {
    const payload = { userID, message, chatId };
    result = await ChatService.handleChat(payload);

  } catch (error) {
    logger.error(`Chat service error for user ${userID}: ${error.message}`);

    const statusMessage = error.message.includes('Chat not found')
      ? 'No active conversation found or invalid ID provided.'
      : error.message;

    return sendWSMessage(ws, 'error', { message: statusMessage });
  }

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

  sendWSMessage(ws, 'chat_response', { isStreaming: true, isContinued: metadata.isNewSession });

  try {
    for await (const token of stream) {
      fullResponse += token;
      sendWSMessage(ws, 'chat_token', { token });
    }

    logger.info(`Stream completed for user ${userID}. Saving conversation...`);

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
      isDisclaimer: finalResult.data.advice?.includes("disclaimer") || false,
    });

  } catch (streamError) {
    logger.error(
      `Stream processing or finalization error for user ${userID}: ${streamError.message}`
    );
    sendWSMessage(ws, 'error', {
      message: 'A critical error occurred while generating or saving the response.',
    });
  }
};
