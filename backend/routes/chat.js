// src/routes/chatRoutes.js
import { ChatController } from '../controllers/index.js';
import { authenticationVerifier, cacheMiddleware } from '../middleware/index.js';

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
   *     summary: Get paginated chat history
   *     description: Returns a paginated list of conversation messages (user + assistant) for the authenticated user.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *           maximum: 100
   *         description: Number of messages per page
   *     responses:
   *       200:
   *         description: Chat history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Response retrieved successfully
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
   *                             example: user
   *                           content:
   *                             type: string
   *                             example: Hello, how are you feeling today?
   *                           timestamp:
   *                             type: string
   *                             format: date-time
   *                             example: 2025-11-01T12:05:00Z
   *                     startedAt:
   *                       type: string
   *                       format: date-time
   *                       example: 2025-11-01T12:00:00Z
   *                     lastActive:
   *                       type: string
   *                       format: date-time
   *                       example: 2025-11-07T12:00:00Z
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: integer
   *                       example: 20
   *                     totalPages:
   *                       type: integer
   *                       example: 4
   *                     currentPage:
   *                       type: integer
   *                       example: 2
   *                     limit:
   *                       type: integer
   *                       example: 5
   *                     links:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           rel:
   *                             type: string
   *                             example: self
   *                           href:
   *                             type: string
   *                             example: http://example.com/api/chat/history?page=2&limit=5
   *       404:
   *         description: No chat history found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/chat/history',
    authenticationVerifier,
    cacheMiddleware,
    ChatController.getChatHistory
  );

  /**
   * @swagger
   * /chat/{id}:
   *   get:
   *     summary: Get paginated chat by ID
   *     description: Retrieves a paginated list of conversation messages for a specific chat ID.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique ID of the chat
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *           maximum: 100
   *         description: Number of messages per page
   *     responses:
   *       200:
   *         description: Chat retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Response retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     chatId:
   *                       type: string
   *                       example: 653fa31eb38b8c4d9011a219
   *                     userID:
   *                       type: string
   *                       example: 653fa31eb38b8c4d9011a218
   *                     history:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           role:
   *                             type: string
   *                             enum: [user, assistant]
   *                             example: user
   *                           content:
   *                             type: string
   *                             example: I’m feeling better today.
   *                           timestamp:
   *                             type: string
   *                             format: date-time
   *                             example: 2025-11-01T12:05:00Z
   *                     startedAt:
   *                       type: string
   *                       format: date-time
   *                       example: 2025-11-01T12:00:00Z
   *                     lastActive:
   *                       type: string
   *                       format: date-time
   *                       example: 2025-11-07T12:00:00Z
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: integer
   *                       example: 20
   *                     totalPages:
   *                       type: integer
   *                       example: 4
   *                     currentPage:
   *                       type: integer
   *                       example: 2
   *                     limit:
   *                       type: integer
   *                       example: 5
   *                     links:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           rel:
   *                             type: string
   *                             example: self
   *                           href:
   *                             type: string
   *                             example: http://example.com/api/chat/653fa31eb38b8c4d9011a219?page=2&limit=5
   *       404:
   *         description: Chat not found
   *       400:
   *         description: Invalid chat ID
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/chat/:id',
    authenticationVerifier,
    cacheMiddleware, // Added for consistency, remove if not needed
    ChatController.getChatById
  );
}
