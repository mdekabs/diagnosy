import { logger } from '../config/index.js';
import { handleChatMessage } from './chat.js';
import { isTokenBlacklisted } from '../middleware/index.js';
import { verifyJWT } from '../utils/auth.js';
import { parse } from 'url';

/**
 * Sends a structured error response to the WebSocket client.
 * @param {WebSocket} ws - The WebSocket connection.
 * @param {string} message - The error message to send.
 */
const sendError = (ws, message) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'error', payload: { message } }));
  }
};

/**
 * Handles a new WebSocket connection.
 * Authenticates the client using JWT, listens for incoming messages,
 * processes chat requests, and manages connection lifecycle events.
 * 
 * @param {WebSocket} ws - The connected WebSocket client.
 * @param {http.IncomingMessage} req - The HTTP request that initiated the WebSocket handshake.
 */
export const handleWebSocketConnection = (ws, req) => {
  const { query } = parse(req.url, true);
  const token = query.token;

  if (!token) {
    ws.close(1008, 'Authentication token required. Connect with ?token=...');
    logger.warn('WS connection denied: Missing token.');
    return;
  }

  verifyJWT(token, isTokenBlacklisted)
    .then(decoded => {
      ws.userID = decoded.sub;
      ws.isProcessingChat = false;

      logger.info(`New WebSocket connection established for user: ${ws.userID}`);

      /**
       * Handles incoming messages from the client.
       * Validates the message format and delegates chat handling logic.
       */
      ws.on('message', (message) => {
        if (!ws.userID) {
          return sendError(ws, 'Session unauthorized. Please reconnect.');
        }

        try {
          const data = JSON.parse(message.toString());

          if (data.message) {
            if (ws.isProcessingChat) {
              return sendError(ws, 'A chat request is already being processed. Please wait.');
            }

            ws.isProcessingChat = true;

            const enrichedPayload = {
              userID: ws.userID,
              isContinued: ws.hasSentFirstMessage,
              message: data.message,
            };

            handleChatMessage(ws, enrichedPayload)
              .finally(() => {
                ws.isProcessingChat = false;
                ws.hasSentFirstMessage = true;
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
       * Handles client disconnections.
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
    .catch(err => {
      ws.close(1008, err.message);
      logger.error(`WS connection denied: ${err.message}`);
    });
};

