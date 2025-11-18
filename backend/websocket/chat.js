import { ChatService } from '../services/chat.js';
import { logger } from '../config/index.js';

/**
 * Sends a structured WebSocket message.
 */
const sendWSMessage = (ws, type, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
};

/**
 * Handles incoming WebSocket chat messages, streams AI responses,
 * and finalizes the conversation.
 */
export const handleChatMessage = async (ws, enrichedPayload) => {
  const { userID, message, chatId } = enrichedPayload;
  let result;

  try {
    result = await ChatService.handleChat({ userID, message, chatId });
  } catch (error) {
    logger.error(`Chat service error for user ${userID}: ${error.message}`);

    const statusMessage = error.message.includes('Chat not found')
      ? 'No active conversation found or invalid ID provided.'
      : error.message;

    return sendWSMessage(ws, 'error', { message: statusMessage });
  }

  // Handle non-stream responses (e.g. crisis advice or refusal)
  if (result.data?.advice) {
    const { advice, isCrisis = false, isContinued = false } = result.data;

    return sendWSMessage(ws, 'chat_response', {
      advice,
      isCrisis,
      isContinued,
      isStreaming: false,
    });
  }

  const { stream, metadata } = result;
  let fullResponse = '';

  // A continued conversation is simply NOT a new session
  const isContinued = !metadata.isNewSession;

  // Notify UI that streaming is starting
  sendWSMessage(ws, 'chat_response', {
    isStreaming: true,
    isContinued,
  });

  try {
    // Stream the response tokens
    for await (const token of stream) {
      fullResponse += token;
      sendWSMessage(ws, 'chat_token', { token });
    }

    logger.info(`Stream completed for user ${userID}. Saving conversation...`);

    // Finalize and save the conversation
    const finalResult = await ChatService.finalizeResponse({
      userID,
      input: message,
      aiResponse: fullResponse,
      chatId: metadata.chatId, // undefined for new sessions → correctly handled inside the service
    });

    const { chatId: finalChatId, isCrisis, advice } = finalResult.data;

    sendWSMessage(ws, 'session_complete', {
      message: 'Conversation session saved.',
      chatId: finalChatId,
      isCrisis,
      isDisclaimer: advice?.includes('disclaimer') || false,
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
