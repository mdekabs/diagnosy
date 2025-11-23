import { logger } from '../config/index.js';
import { handleChatMessage } from './chat.js';
import { parse } from 'url';
import { verifyTokenCore } from '../middleware/tokenization.js';

/**
 * Sends a structured error response to a WebSocket client.
 * @param {WebSocket} ws
 * @param {string} message
 */
const sendError = (ws, message) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'error', payload: { message } }));
  }
};

/**
 * Handles a newly established WebSocket connection.
 * Responsibilities:
 * - Authenticate connection via token (?token=...)
 * - Track user session info (userID, chatId, processing state)
 * - Route incoming chat messages to the chat handler
 * - Forward session updates back to the client
 * - Enforce single active chat request at a time
 * - Provide graceful error handling & cleanup on close
 *
 * @param {WebSocket} ws
 * @param {IncomingMessage} req
 */
export const handleWebSocketConnection = (ws, req) => {
  const { query } = parse(req.url, true);
  const token = query.token;

  /** Reject if token missing */
  if (!token) {
    ws.close(1008, 'Authentication token required. Connect with ?token=...');
    logger.warn('WS connection denied: Missing token.');
    return;
  }

  /**
   * STEP 1 — Authenticate the connection
   */
  verifyTokenCore(token)
    .then((decoded) => {
      const userID = decoded.id;

      // Attach to WebSocket session
      ws.userID = userID;
      ws.isProcessingChat = false; // Prevents overlapping stream requests
      ws.chatId = null;

      logger.info(`New WebSocket connection established for user: ${ws.userID}`);

      /**
       * STEP 2 — Handle incoming messages from the client
       */
      ws.on('message', (message) => {
        if (!ws.userID) {
          return sendError(ws, 'Session unauthorized. Please reconnect.');
        }

        let data;
        try {
          data = JSON.parse(message.toString());
        } catch (err) {
          logger.error(`Invalid WS payload for ${ws.userID}: ${err.message}`);
          return sendError(ws, 'Invalid message format (must be valid JSON).');
        }

        /**
         * CLIENT COMMAND: Clear current chat session
         */
        if (data.command === 'clear_chat') {
          ws.chatId = null;
          return sendError(ws, 'Chat cleared successfully.');
        }

        /**
         * CLIENT COMMAND: Chat message from the user
         */
        if (data.message) {
          if (ws.isProcessingChat) {
            return sendError(
              ws,
              'A chat request is already being processed. Please wait.'
            );
          }

          ws.isProcessingChat = true;

          const enrichedPayload = {
            userID: ws.userID,
            chatId: ws.chatId,
            isContinued: !!ws.chatId,
            message: data.message,
          };

          /**
           * Patch ws.send temporarily to capture "session_complete"
           * messages so we can update ws.chatId dynamically.
           */
          const originalSend = ws.send;
          ws.send = (jsonMessage) => {
            try {
              const parsed = JSON.parse(jsonMessage);
              if (parsed.type === 'session_complete' && parsed.payload.chatId) {
                ws.chatId = parsed.payload.chatId;
              }
            } catch (_) {
              /* ignore parse failures — don't break sending */
            }
            originalSend.call(ws, jsonMessage);
          };

          /**
           * Handle the chat (streaming + finalization)
           */
          handleChatMessage(ws, enrichedPayload).finally(() => {
            ws.isProcessingChat = false;
            ws.send = originalSend; // Restore original send
          });

          return;
        }

        // Invalid structure
        sendError(ws, 'Invalid message payload. Expected {"message": "..."}');
      });

      /**
       * STEP 3 — Handle WebSocket disconnection
       */
      ws.on('close', () => {
        logger.info(`WebSocket connection closed for user: ${ws.userID}`);
      });

      /**
       * STEP 4 — WebSocket-level error handling
       */
      ws.on('error', (err) => {
        logger.error(`WebSocket error for user ${ws.userID}: ${err.message}`);
      });
    })

    /**
     * TOKEN AUTH FAILURE
     */
    .catch((err) => {
      ws.close(1008, err.message);
      logger.error(`WS connection denied: ${err.message}`);
    });
};
