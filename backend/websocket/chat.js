import { ChatService } from '../services/chat.js';
import { logger } from '../config/index.js';

/**
 * Safely sends a structured JSON message over WebSocket.
 * @param {WebSocket} ws - Active WebSocket connection.
 * @param {string} type - Event type identifier.
 * @param {object} payload - Additional payload object.
 */
const sendWSMessage = (ws, type, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
};

/**
 * Handles inbound WebSocket chat traffic:
 * 1. Validates and processes the user’s message.
 * 2. Initiates streaming response from the AI model.
 * 3. Sends tokens live to the client.
 * 4. Finalizes and saves the conversation on completion.
 *
 * @param {WebSocket} ws - Active WebSocket connection.
 * @param {object} enrichedPayload -   { userID, message, chatId }
 */
export const handleChatMessage = async (ws, enrichedPayload) => {
  const { userID, message, chatId } = enrichedPayload;
  let result;

  try {
    // Primary chat handler (classification, context building, streaming)
    result = await ChatService.handleChat({ userID, message, chatId });
  } catch (error) {
    logger.error(`Chat service error for user ${userID}: ${error.message}`);

    const statusMessage = error.message.includes('Chat not found')
      ? 'No active conversation found or invalid ID provided.'
      : error.message;

    return sendWSMessage(ws, 'error', { message: statusMessage });
  }

  /**
   * CASE 1 — Non streaming response (e.g. crisis detection or refusal)
   */
  if (result.data?.advice) {
    const { advice, isCrisis = false, isContinued = false } = result.data;

    return sendWSMessage(ws, 'chat_response', {
      advice,
      isCrisis,
      isContinued,
      isStreaming: false,
    });
  }

  /**
   * CASE 2 — Streaming AI response
   */
  const { stream, metadata } = result;
  let fullResponse = '';

  // A continued conversation = not a new session
  const isContinued = !metadata.isNewSession;

  // Notify UI that streaming is about to start
  sendWSMessage(ws, 'chat_response', {
    isStreaming: true,
    isContinued,
  });

  try {
    /**
     * Stream tokens to the UI in real time
     */
    for await (const token of stream) {
      fullResponse += token;
      sendWSMessage(ws, 'chat_token', { token });
    }

    logger.info(`Stream completed for user ${userID}. Saving conversation...`);

    /**
     * Finalize: Save user input + AI output
     */
    const finalResult = await ChatService.finalizeResponse({
      userID,
      input: message,
      aiResponse: fullResponse,
      chatId: metadata.chatId, // undefined for new session → correctly handled
    });

    const { chatId: finalChatId, isCrisis, advice } = finalResult.data;

    // Notify client that session is complete
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
