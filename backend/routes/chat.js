import { ChatController } from '../controllers/index.js';
import { authenticationVerifier, cacheMiddleware, pagination } from '../middleware/index.js';

/**
 * ------------------------------------------------------------------
 * Mental-Health Chat API Routes
 * All real-time chat is handled by the WebSocket (WS) endpoint.
 * These HTTP routes are for utility functions (History, End Session).
 * ------------------------------------------------------------------
 */
export default function chatRoutes(router) {

  // --------------------------------------------------------------
  // NOTE: /chat/start and /chat/continue routes have been removed.
  // The core chat functionality now flows through the WebSocket.
  // --------------------------------------------------------------

  /**
   * @swagger
   * /chat/history:
   *   get:
   *     summary: Get full chat history
   *     description: Returns the complete conversation (user + assistant messages) stored in the database.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Optional pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Max messages per page
   *     responses:
   *       200:
   *         description: History retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     history:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           role:
   *                             type: string
   *                             enum: [user, assistant]
   *                           content:
   *                             type: string
   *                           startedAt:
   *                             type: string
   *                             format: date-time
   *                           lastActive:
   *                             type: string
   *                             format: date-time
   *       404:
   *         description: No chat history
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/chat/history',
    authenticationVerifier,
    cacheMiddleware,  // optional: cache per user
    pagination,       // optional: if you later paginate in service
    ChatController.getChatHistory
  );

  // ----------------------------------------------------------------

  /**
   * @swagger
   * /chat/end:
   *   post:
   *     summary: End and clear the current chat session
   *     description: Deletes the conversation from the database. User can start a fresh, new session.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Session ended
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Conversation ended. Take care.
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/chat/end',
    authenticationVerifier,
    ChatController.endChat
  );
}

