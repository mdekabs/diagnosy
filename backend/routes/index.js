import express from 'express';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import ChatController from "../controllers/ChatController";
import Pagination from '../middleware/_pagination';  // Import pagination middleware

/**
 * Express router for handling user-related and authentication routes.
 *
 * @type {express.Router}
 */
const router = express.Router();

/**
 * Route for creating a new user.
 *
 * @name POST /users
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {void}
 */
router.post('/users', UsersController.postNew);

/**
 * Route for user sign-in.
 *
 * @name POST /sign_in
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {void}
 */
router.post('/sign_in', AuthController.getConnect);

/**
 * Route for user sign-out.
 *
 * @name GET /sign_out
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {void}
 */
router.get('/sign_out', AuthController.getDisconnect);

/**
 * Route for retrieving information about the authenticated user.
 *
 * @name GET /users/me
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {void}
 */
router.get('/users/me', AuthController.getMe);

/**
 * Route for initiating a chat interaction.
 *
 * @name POST /chats
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {Promise<void>}
 */
router.post("/chats", ChatController.createChat);

/**
 * Route for retrieving chat history with pagination applied.
 *
 * @name GET /chats
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {Promise<void>}
 */
router.get("/chats", Pagination, ChatController.getChatHistory);  // Apply pagination middleware here

/**
 * Route for checking the status.
 *
 * @name GET /status
 * @function
 * @memberof module:Routes
 * @inner
 * @param {Object} request - The request object.
 * @param {Object} response - The response object.
 * @returns {void}
 */
router.get('/status', async (req, res) => {
  res.status(200).json({"status": "Green", "message": "Daisy says hi"});
});

export default router;
