import { logger } from '../config/index.js';
import { handleChatMessage } from './chat.js';
import { verifyJWT } from '../utils/auth.js';
import { parse } from 'url';

/**
 * Sends a structured error message to the WebSocket client.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {string} message - Error message to send.
 */
const sendError = (ws, message) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'error', payload: { message } }));
  }
};

/**
 * Handles a new WebSocket connection.
 * Authenticates the client using JWT and listens for incoming messages.
 * @param {WebSocket} ws - The connected WebSocket client.
 * @param {http.IncomingMessage} req - The initial HTTP request used for the WebSocket handshake.
 */
export const handleWebSocketConnection = (ws, req) => {
  const { query } = parse(req.url, true);
  const token = query.token;

  if (!token) {
    ws.close(1008, 'Authentication token required. Connect with ?token=...');
    logger.warn('WS connection denied: Missing token.');
    return;
  }

  verifyJWT(token)
    .then(decoded => {
      ws.userID = decoded.sub;
      ws.isChatActive = false;

      logger.info(`New WebSocket connection established for user: ${ws.userID}`);

      /**
       * Listens for incoming messages from the WebSocket client.
       * Validates message format and delegates chat handling.
       */
      ws.on('message', (message) => {
        if (!ws.userID) {
          return sendError(ws, 'Session unauthorized. Please reconnect.');
        }

        try {
          const data = JSON.parse(message.toString());

          if (data.message) {
            const enrichedPayload = {
              userID: ws.userID,
              isContinued: ws.isChatActive,
              message: data.message,
            };

            handleChatMessage(ws, enrichedPayload);
            ws.isChatActive = true;
          } else {
            sendError(ws, 'Invalid message payload. Expected {"message": "..."}');
          }
        } catch (err) {
          logger.error(`Error processing WS message for user ${ws.userID}: ${err.message}`);
          sendError(ws, 'Invalid message format (must be valid JSON).');
        }
      });

      /**
       * Logs connection closure for the authenticated user.
       */
      ws.on('close', () => {
        logger.info(`WebSocket connection closed for user: ${ws.userID}`);
      });

      /**
       * Logs unexpected WebSocket errors.
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

