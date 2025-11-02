import { ChatController } from '../controllers/index.js';
import { authenticationVerifier, cacheMiddleware, pagination } from '../middleware/index.js';

/**
 * ------------------------------------------------------------------
 * Mental-Health Chat API Routes
 * Includes chat history retrieval and fetching chat by ID.
 * ------------------------------------------------------------------
 */
export default function chatRoutes(router) {
  /**
   * @swagger
   * tags:
   *   - name: Chat
   *     description: Endpoints for chat history and message retrieval
   */

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
   *         description: History retrieved successfully
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
   *                   example: Chat history retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     history:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                             example: 653fa31eb38b8c4d9011a219
   *                           role:
   *                             type: string
   *                             enum: [user, assistant]
   *                           content:
   *                             type: string
   *                             example: Hello, how are you feeling today?
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

  /**
   * @swagger
   * /chat/{id}:
   *   get:
   *     summary: Get chat message by ID
   *     description: Retrieve a single chat message using its unique MongoDB ID.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique ID of the chat message
   *     responses:
   *       200:
   *         description: Chat message retrieved successfully
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
   *                   example: Chat message retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                       example: 653fa31eb38b8c4d9011a219
   *                     role:
   *                       type: string
   *                       enum: [user, assistant]
   *                     content:
   *                       type: string
   *                       example: I’m feeling better today.
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       404:
   *         description: Chat not found
   *       400:
   *         description: Invalid chat ID
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/chat/:id',
    authenticationVerifier,
    ChatController.getChatById
  );
}

