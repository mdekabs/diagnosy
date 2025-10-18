import { AuthController } from '../controllers/index.js';
import { authenticationVerifier } from '../middleware/tokenization.js';

// Defines authentication routes for the Express router
export default function authRoutes(router) {
  /**
   * @swagger
   * /auth/me:
   *   get:
   *     summary: Retrieve current user details
   *     description: Returns the current user's details (userId, username, email) from MongoDB. Requires a valid user JWT token from POST /auth/login or POST /auth/register.
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User details retrieved successfully
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
   *                   example: User details retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: string
   *                       example: 12345
   *                     username:
   *                       type: string
   *                       example: user1
   *                     email:
   *                       type: string
   *                       example: user@example.com
   *       401:
   *         description: Unauthorized (missing or invalid user token)
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
   *                   example: Invalid or missing user token
   *       404:
   *         description: User not found in MongoDB
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
   *                   example: User not found
   */
  router.get('/auth/me', authenticationVerifier, AuthController.getMe);

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     description: Registers a new user with username, email, and password.
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 example: user1
   *               email:
   *                 type: string
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *     responses:
   *       200:
   *         description: Registration successful
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
   *                   example: Registration successful
   *                 data:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: string
   *                       example: 12345
   *                     token:
   *                       type: string
   *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   *       400:
   *         description: Invalid input (e.g., missing username, email, or password)
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
   *                   example: Username is required
   *       409:
   *         description: Email already in use
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
   *                   example: Email is already in use
   */
  router.post('/auth/register', AuthController.register);

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login a user
   *     description: Authenticates a user with username and password.
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 example: user1
   *               password:
   *                 type: string
   *                 example: password123
   *     responses:
   *       200:
   *         description: Login successful
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
   *                   example: Login successful
   *                 data:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: string
   *                       example: 12345
   *                     token:
   *                       type: string
   *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   *       401:
   *         description: Invalid credentials
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
   *                   example: Invalid username or password
   *       403:
   *         description: Account locked
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
   *                   example: Account locked. Try again after 12:00:00 AM
   */
  router.post('/auth/login', AuthController.login);

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Logout a user
   *     description: Logs out a user by blacklisting the provided JWT token. Requires authentication.
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
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
   *                   example: Logout successful
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
  router.post('/auth/logout', authenticationVerifier, AuthController.logout);

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     summary: Initiate password reset
   *     description: Sends a password reset email to the provided email address.
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 example: user@example.com
   *     responses:
   *       200:
   *         description: Password reset email sent
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
   *                   example: Password reset email sent.
   *       404:
   *         description: User not found
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
   *                   example: User not found
   */
  router.post('/auth/forgot-password', AuthController.forgotPassword);

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: Reset password with token
   *     description: Resets the user password using a valid reset token.
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - newPassword
   *             properties:
   *               token:
   *                 type: string
   *                 example: reset-token-123
   *               newPassword:
   *                 type: string
   *                 example: newpassword123
   *     responses:
   *       200:
   *         description: Password reset successful
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
   *                   example: Password reset successful.
   *       400:
   *         description: Invalid token or password
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
   *                   example: Invalid or expired reset token
   */
  router.post('/auth/reset-password', AuthController.resetPassword);
}
