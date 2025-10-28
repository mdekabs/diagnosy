import { ChatController } from '../controllers/index.js';
import { authenticationVerifier, cacheMiddleware, pagination } from '../middleware/index.js';

/**
 * ------------------------------------------------------------------
 *  Mental-Health Chat API Routes
 *  All business logic lives in ChatService.
 * ------------------------------------------------------------------
 */
export default function chatRoutes(router) {
  /**
   * @swagger
   * /chat/start:
   *   post:
   *     summary: Start a new mental health conversation
   *     description: Begins a supportive chat about stress, anxiety, mood, or emotional well-being.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - message
   *             properties:
   *               message:
   *                 type: string
   *                 example: "I've been feeling really anxious at work."
   *     responses:
   *       200:
   *         description: Supportive response generated
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
   *                   example: I'm here to listen and support you.
   *                 data:
   *                   type: object
   *                   properties:
   *                     advice:
   *                       type: string
   *                     isNewSession:
   *                       type: boolean
   *                     isCrisis:
   *                       type: boolean
   *                       description: If true, show emergency hotline immediately
   *       400:
   *         description: Invalid or off-topic message
   *       401:
   *         description: Unauthorized
   */
  router.post(
    "/chat/start",
    authenticationVerifier,
    ChatController.createChat
  );

  /**
   * @swagger
   * /chat/continue:
   *   post:
   *     summary: Continue an existing mental health conversation
   *     description: Send a follow-up message in the same emotional support session.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - message
   *             properties:
   *               message:
   *                 type: string
   *                 example: "What can I do to calm down right now?"
   *     responses:
   *       200:
   *         description: Continued support
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     advice:
   *                       type: string
   *                     isContinued:
   *                       type: boolean
   *                     isCrisis:
   *                       type: boolean
   *       400:
   *         description: No active session or off-topic
   *       401:
   *         description: Unauthorized
   */
  router.post(
    "/chat/continue",
    authenticationVerifier,
    ChatController.continueChat
  );

  /**
   * @swagger
   * /chat/history:
   *   get:
   *     summary: Get full chat history
   *     description: Returns the complete conversation (user + assistant messages).
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
   *                     startedAt:
   *                       type: string
   *                       format: date-time
   *                     lastActive:
   *                       type: string
   *                       format: date-time
   *       404:
   *         description: No chat history
   *       401:
   *         description: Unauthorized
   */
  router.get(
    "/chat/history",
    authenticationVerifier,
    cacheMiddleware,   // optional: cache per user
    pagination,        // optional: if you later paginate in service
    ChatController.getChatHistory
  );

  /**
   * @swagger
   * /chat/end:
   *   post:
   *     summary: End and clear the current chat session
   *     description: Deletes the conversation. User can start fresh.
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
   *                 message:
   *                   type: string
   *       401:
   *         description: Unauthorized
   */
  router.post(
    "/chat/end",
    authenticationVerifier,
    ChatController.endChat
  );
}
