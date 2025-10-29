// src/routes/chatRoutes.js
import { ChatController } from '../controllers/index.js';
import { authenticationVerifier, cacheMiddleware, pagination } from '../middleware/index.js';

/**
 * ------------------------------------------------------------------
 * Mental-Health Chat API Routes
 * Only includes the chat history route.
 * ------------------------------------------------------------------
 */
export default function chatRoutes(router) {
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
   *         description: No chat history found
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/chat/history',
    authenticationVerifier,
    cacheMiddleware,
    pagination,
    ChatController.getChatHistory
  );
}

