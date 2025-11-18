// src/routes/chatRoutes.js
import { ChatController } from '../controllers/index.js';
import { authenticationVerifier, cacheMiddleware } from '../middleware/index.js';

/**
 * ------------------------------------------------------------------
 * Mental-Health Chat API Routes
 * One encrypted chat per authenticated user. No multi-session support.
 * ------------------------------------------------------------------
 */
export default function chatRoutes(router) {
  /**
   * @swagger
   * tags:
   *   - name: Chat
   *     description: Encrypted conversation management (one chat per user)
   */

  /**
   * @swagger
   * /chat/history:
   *   get:
   *     summary: Get paginated chat history
   *     description: Returns the full decrypted conversation history (newest first) for the authenticated user.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *     responses:
   *       200:
   *         description: Chat history retrieved successfully
   *       404:
   *         description: No conversation started yet
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/chat/history',
    authenticationVerifier,
    cacheMiddleware, // Optional: cache for 30s if you want to reduce DB reads
    ChatController.getChatHistory
  );

  /**
   * @swagger
   * /chat/clear:
   *   delete:
   *     summary: Clear conversation history
   *     description: Removes all messages but keeps the chat document (disclaimer resets).
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Conversation cleared successfully
   *       401:
   *         description: Unauthorized
   */
  router.delete(
    '/chat/clear',
    authenticationVerifier,
    ChatController.clearChat
  );

  /**
   * @swagger
   * /chat/end:
   *   delete:
   *     summary: Permanently end and delete the conversation
   *     description: Deletes the entire chat document. User will start fresh on next message.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Conversation ended and deleted
   *       401:
   *         description: Unauthorized
   */
  router.delete(
    '/chat/end',
    authenticationVerifier,
    ChatController.endChat
  );

  // REMOVED: /chat/:id route
  // → No longer exists. There is only ONE chat per user.
  // → Clients should never need to know or pass a chatId.
}
