import { logger } from '../config/index.js';
import { handleChatMessage } from './chat.js';
import { parse } from 'url';
import { verifyTokenCore } from '../middleware/tokenization.js'; 

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
 * Authenticates the client using the verifyTokenCore function (which includes
 * the user existence check), and manages the chat session lifecycle.
 * * @param {WebSocket} ws - The connected WebSocket client.
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

    // 1. Authenticate using the CORE function. This single call now verifies 
    //    the token and confirms the user's existence in the database.
    verifyTokenCore(token)
        .then(decoded => {
            // If we reach here, the token is valid, not blacklisted, AND the user exists.
            const userID = decoded.id; 
            ws.userID = userID;
            ws.isProcessingChat = false;
            ws.hasSentFirstMessage = false; // Initialize state

            logger.info(`New WebSocket connection established for user: ${ws.userID}`);

            /**
             * Handles incoming messages from the client.
             */
            ws.on('message', (message) => {
                // Failsafe check in case session somehow got cleared
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

                        // Delegates to the chat handler
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
             * Handles client disconnections and errors.
             */
            ws.on('close', () => {
                logger.info(`WebSocket connection closed for user: ${ws.userID}`);
            });

            ws.on('error', (err) => {
                logger.error(`WebSocket error for user ${ws.userID}: ${err.message}`);
            });

        }) 
        .catch(err => {
            // Catches any authentication/verification error from verifyTokenCore 
            // (invalid token, blacklisted, or user deleted from MongoDB)
            ws.close(1008, err.message);
            logger.error(`WS connection denied: ${err.message}`);
        });
};
