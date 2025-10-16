import { ChatController } from "../controllers/chat.js";
import { authenticationVerifier, optionalVerifier } from "../middleware/tokenization.js";
import { cacheMiddleware, clearCache } from "../middleware/caching.js";

// Defines chat routes for the Express router
export default function chatRoutes(router) {
  /**
   * @swagger
   * /chat:
   *   post:
   *     summary: Create a chat for an authenticated user
   *     description: Creates a new chat session for an authenticated user based on the provided symptom. Requires a valid user JWT token.
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
   *               - symptom
   *             properties:
   *               symptom:
   *                 type: string
   *                 example: I have a sore throat.
   *     responses:
   *       200:
   *         description: Chat response generated successfully
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
   *                   example: Response generated successfully!
   *                 data:
   *                   type: object
   *                   properties:
   *                     advice:
   *                       type: string
   *                       example: A sore throat could be due to a viral infection or allergies. Please consult a healthcare professional.
   *                     disclaimer:
   *                       type: string
   *                       example: "Please note: This advice is not a substitute for professional medical care"
   *       400:
   *         description: Invalid input (e.g., missing or non-health-related symptom)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: Symptom is required
   *       401:
   *         description: Unauthorized (invalid or missing token)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: You are not authenticated. Please log in to get a new token.
   */
  router.post("/chat", authenticationVerifier, clearCache, ChatController.createChat);

  /**
   * @swagger
   * /chat/guest:
   *   post:
   *     summary: Create a chat for a guest user
   *     description: Creates a new chat session for a guest user based on the provided symptom. Optionally accepts a guest JWT token for history tracking.
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
   *               - symptom
   *             properties:
   *               symptom:
   *                 type: string
   *                 example: I have a headache and fever.
   *     responses:
   *       200:
   *         description: Chat response generated successfully
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
   *                   example: Response generated successfully!
   *                 data:
   *                   type: object
   *                   properties:
   *                     advice:
   *                       type: string
   *                       example: Your symptoms could indicate a viral infection or dehydration. Please consult a healthcare professional.
   *                     disclaimer:
   *                       type: string
   *                       example: "Please note: This advice is not a substitute for professional medical care"
   *       400:
   *         description: Invalid input (e.g., missing or non-health-related symptom)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: Symptom is required
   *       401:
   *         description: Unauthorized (invalid or expired guest token, if provided)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: Invalid or expired guest token.
   */
  router.post("/chat/guest", optionalVerifier, clearCache, ChatController.createGuestChat);

  /**
   * @swagger
   * /chat/history:
   *   get:
   *     summary: Get chat history for an authenticated user
   *     description: Retrieves the chat history for an authenticated user. Requires a valid user JWT token.
   *     tags: [Chat]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Chat history retrieved successfully
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
   *                   example: Chat history retrieved successfully!
   *                 data:
   *                   type: object
   *                   properties:
   *                     chats:
   *                       type: object
   *                       properties:
   *                         _id:
   *                           type: string
   *                           example: chat-id-123
   *                         userID:
   *                           type: string
   *                           example: 12345
   *                         history:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               role:
   *                                 type: string
   *                                 example: user
   *                               content:
   *                                 type: string
   *                                 example: I have a sore throat.
   *                               timestamp:
   *                                 type: string
   *                                 format: date-time
   *                                 example: 2025-10-14T04:15:00Z
   *                         createdAt:
   *                           type: string
   *                           format: date-time
   *                           example: 2025-10-14T04:15:00Z
   *                         updatedAt:
   *                           type: string
   *                           format: date-time
   *                           example: 2025-10-14T04:15:01Z
   *       401:
   *         description: Unauthorized (invalid or missing token)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: You are not authenticated. Please log in to get a new token.
   *       404:
   *         description: Chat history not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 type:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: Chat history not found
   */
  router.get("/chat/history", authenticationVerifier, cacheMiddleware, ChatController.getChatHistory);
}
