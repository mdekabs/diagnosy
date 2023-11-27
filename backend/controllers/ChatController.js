import readlineSync from 'readline-sync';
import colors from 'colors';
import OpenaiService from '../services/OpenaiService.js';
import dbClient from '../storage/db.js';
import redisClient from '../storage/redis.js';

/**
 * Class representing the Chat Controller.
 */
class ChatController {
  /**
   * Creates a chat and generates a response using the OpenAI service.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>} A Promise that resolves when the operation is complete.
   */
  static async createChat(request, response) {
    /**
     * Destructures the symptom and token from the request body and headers, respectively.
     *
     * @type {string}
     */
    const { symptom } = request.body;
    const token = request.headers['auth-token'];

    /**
     * Validates the presence of the authentication token in the headers.
     */
    if (!token) {
      response.status(401).json({
        status: "error",
        message: "Unauthorized! auth-token required",
        data: null,
      });
    }

    /**
     * Constructs the key for retrieving the user ID associated with the token from Redis.
     *
     * @type {string}
     */
    const key = `auth_${token}`;

    /**
     * Retrieves the user ID from Redis using the authentication token.
     *
     * @type {string | null}
     */
    const userID = await redisClient.get(key);

    /**
     * Validates the presence and validity of the user ID.
     */
    if (!userID) {
      response.status(401).json({
        status: "error",
        message: "Unauthorized! invalid token",
        data: null,
      });
    }

    /**
     * Retrieves the user from the database using the user ID.
     *
     * @type {Object | null}
     */
    const user = await dbClient.fetchUserByID(userID);

    /**
     * Sends an error response if the user is not found.
     */
    if (!user) {
      response.status(404).json({
        status: "error",
        message: "User not found",
        data: null,
      });
    }

    /**
     * Validates the presence of the symptom in the request body.
     */
    if (!symptom) {
      response.status(400).json({
        status: "error",
        message: "Symptom is required",
        data: null,
      });
    }

    /**
     * Retrieves the chat history for the user from the database.
     *
     * @type {Object}
     */
    const chats = await dbClient.fetchUserChat(userID);
    const chatHistory = chats.history;

    let completionText;
    try {
      /**
       * Appends the user's symptom to the chat history.
       */
      chatHistory.push({ role: "user", content: symptom });

      /**
       * Generates a completion text using the OpenAI service.
       */
      completionText = await OpenaiService.getChatbotCompletion(chatHistory);

      /**
       * Appends the assistant's response to the chat history.
       */
      chatHistory.push({ role: "assistant", content: completionText });

      /**
       * Updates the chat history in the database.
       */
      await dbClient.updateChatHistory(chats._id, chatHistory);
    } catch (error) {
      console.log(error);

      /**
       * Sends an error response in case of an exception.
       */
      response.status(504).json({
        status: "error",
        message: error.message,
        data: null,
      });
    }

    /**
     * Sends a success response with the generated advice.
     */
    response.status(200).json({
      status: "success",
      message: "Response generated successfully!",
      data: {
        advice: completionText,
      },
    });
  }

  /**
   * Retrieves the chat history for the authenticated user.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>} A Promise that resolves when the operation is complete.
   */
  static async getChatHistory(request, response) {
    /**
     * Retrieves the authentication token from the request headers.
     *
     * @type {string}
     */
    const token = request.headers['auth-token'];

    /**
     * Validates the presence of the authentication token in the headers.
     */
    if (!token) {
      response.status(401).json({
        status: "error",
        message: "Unauthorized! auth-token required",
        data: null,
      });
    }

    /**
     * Constructs the key for retrieving the user ID associated with the token from Redis.
     *
     * @type {string}
     */
    const key = `auth_${token}`;

    /**
     * Retrieves the user ID from Redis using the authentication token.
     *
     * @type {string | null}
     */
    const userID = await redisClient.get(key);

    /**
     * Validates the presence and validity of the user ID.
     */
    if (!userID) {
      response.status(401).json({
        status: "error",
        message: "Unauthorized! invalid token",
        data: null,
      });
    }

    /**
     * Retrieves the user from the database using the user ID.
     *
     * @type {Object | null}
     */
    const user = await dbClient.fetchUserByID(userID);

    /**
     * Sends an error response if the user is not found.
     */
    if (!user) {
      response.status(404).json({
        status: "error",
        message: "User not found",
        data: null,
      });
    }

    try {
      /**
       * Retrieves the chat history for the user from the database.
       *
       * @type {Object}
       */
      const chats = await dbClient.fetchUserChat(userID);

      /**
       * Sends a success response with the retrieved chat history.
       */
      response.status(200).json({
        status: "success",
        message: "Chat history retrieved successfully!",
        data: { chats },
      });
    } catch (error) {
      console.log(error);

      /**
       * Sends an error response in case of an exception.
       */
      response.status(504).json({
        status: "error",
        message: error.message,
        data: null,
      });
    }
  }
}

export default ChatController;
