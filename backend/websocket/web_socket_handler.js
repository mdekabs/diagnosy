import { logger } from '../config/index.js';
import { handleChatMessage } from './chat.js';
import { parse } from 'url';
import { verifyTokenCore } from '../middleware/tokenization.js';

/**
 * Sends a structured error response to the WebSocket client.
 */
const sendError = (ws, message) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'error', payload: { message } }));
  }
};

/**
 * Handles a new WebSocket connection: authenticates the client,
 * listens for messages, forwards chat requests, and manages session cleanup.
 */
export const handleWebSocketConnection = (ws, req) => {
  const { query } = parse(req.url, true);
  const token = query.token;

  if (!token) {
    ws.close(1008, 'Authentication token required. Connect with ?token=...');
    logger.warn('WS connection denied: Missing token.');
    return;
  }

  verifyTokenCore(token)
    .then((decoded) => {
      const userID = decoded.id;

      ws.userID = userID;
      ws.isProcessingChat = false;
      ws.chatId = null;

      logger.info(`New WebSocket connection established for user: ${ws.userID}`);

      /**
       * Handles incoming client messages.
       */
      ws.on('message', (message) => {
        if (!ws.userID) {
          return sendError(ws, 'Session unauthorized. Please reconnect.');
        }

        try {
          const data = JSON.parse(message.toString());

          if (data.command === 'clear_chat') {
            ws.chatId = null;
            return sendError(ws, 'Chat cleared successfully.');
          }

          if (data.message) {
            if (ws.isProcessingChat) {
              return sendError(ws, 'A chat request is already being processed. Please wait.');
            }

            ws.isProcessingChat = true;

            const enrichedPayload = {
              userID: ws.userID,
              isContinued: !!ws.chatId,
              chatId: ws.chatId,
              message: data.message,
            };

            const originalSendWSMessage = ws.send;
            ws.send = (jsonMessage) => {
              const parsedMessage = JSON.parse(jsonMessage);
              if (
                parsedMessage.type === 'session_complete' &&
                parsedMessage.payload.chatId
              ) {
                ws.chatId = parsedMessage.payload.chatId;
              }
              originalSendWSMessage.call(ws, jsonMessage);
            };

            handleChatMessage(ws, enrichedPayload).finally(() => {
              ws.isProcessingChat = false;
              if (ws.send !== originalSendWSMessage) ws.send = originalSendWSMessage;
            });
          } else {
            sendError(ws, 'Invalid message payload. Expected {"message": "..."}');
          }
        } catch (err) {
          logger.error(`Error processing WS message for user ${ws.userID}: ${err.message}`);
          sendError(ws, 'Invalid message format (must be valid JSON).');
        }
      });

      /**
       * Handles WebSocket connection termination.
       */
      ws.on('close', () => {
        logger.info(`WebSocket connection closed for user: ${ws.userID}`);
      });

      /**
       * Handles WebSocket-level errors.
       */
      ws.on('error', (err) => {
        logger.error(`WebSocket error for user ${ws.userID}: ${err.message}`);
      });
    })
    .catch((err) => {
      ws.close(1008, err.message);
      logger.error(`WS connection denied: ${err.message}`);
    });
};
