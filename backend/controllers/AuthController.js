import { v4 as uuidv4 } from "uuid";
import dbClient from "../storage/db";
import redisClient from "../storage/redis";
import sha1 from "sha1";

// Constants
const AUTH_PREFIX = "auth_";
const TOKEN_EXPIRY = 86400; // 24 hours in seconds

const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";

const MSG_SIGNIN_SUCCESS = "Sign in successful";
const MSG_INCORRECT_PASSWORD = "Incorrect password";
const MSG_USER_NOT_EXIST = "User does not exist";
const MSG_INVALID_TOKEN = "Invalid token";
const MSG_INTERNAL_ERROR = "Internal Server Error";
const MSG_USER_FETCHED = "Current user fetched successfully";
const MSG_USER_NOT_FOUND = "User not found";

/**
 * Class representing the authentication controller.
 */
class AuthController {
  /**
   * Authenticates a user and generates a token upon successful sign-in.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async getConnect(request, response) {
    try {
      const { email, password } = request.body;
      if (!email || !password) {
        const msg = "Email and password must be provided";
        console.error(`getConnect: ${msg}`);
        return response.status(400).json({
          status: STATUS_ERROR,
          message: msg,
          data: null,
        });
      }

      const user = await dbClient.fetchUserByEmail({ email });
      if (!user) {
        const msg = `User with email ${email} does not exist`;
        console.error(`getConnect: ${msg}`);
        return response.status(401).json({
          status: STATUS_ERROR,
          message: MSG_USER_NOT_EXIST,
          data: null,
        });
      }

      const hashedPassword = sha1(password);
      if (hashedPassword !== user.password) {
        const msg = `Password mismatch for user ${email}`;
        console.error(`getConnect: ${msg}`);
        return response.status(401).json({
          status: STATUS_ERROR,
          message: MSG_INCORRECT_PASSWORD,
          data: null,
        });
      }

      const token = uuidv4();
      const key = `${AUTH_PREFIX}${token}`;
      await redisClient.set(key, user._id.toString(), TOKEN_EXPIRY);
      console.info(`getConnect: User ${email} authenticated successfully with token ${token}`);

      return response.status(200).json({
        status: STATUS_SUCCESS,
        message: MSG_SIGNIN_SUCCESS,
        data: { token },
      });
    } catch (error) {
      console.error(`getConnect: Internal server error - ${error.message}`, error);
      return response.status(500).json({
        status: STATUS_ERROR,
        message: `${MSG_INTERNAL_ERROR}: ${error.message}`,
        data: null,
      });
    }
  }

  /**
   * Logs out a user by deleting their authentication token.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async getDisconnect(request, response) {
    try {
      const token = request.headers["auth-token"];
      if (!token) {
        const msg = "No auth-token provided in headers";
        console.error(`getDisconnect: ${msg}`);
        return response.status(401).json({
          status: STATUS_ERROR,
          message: msg,
          data: null,
        });
      }

      const key = `${AUTH_PREFIX}${token}`;
      const userID = await redisClient.get(key);
      if (!userID) {
        const msg = `Token ${token} is invalid or expired`;
        console.error(`getDisconnect: ${msg}`);
        return response.status(401).json({
          status: STATUS_ERROR,
          message: MSG_INVALID_TOKEN,
          data: null,
        });
      }

      const user = await dbClient.fetchUserByID(userID);
      if (!user) {
        const msg = `User not found for token ${token} (userID: ${userID})`;
        console.error(`getDisconnect: ${msg}`);
        return response.status(404).json({
          status: STATUS_ERROR,
          message: MSG_INVALID_TOKEN,
          data: null,
        });
      }

      await redisClient.del(key);
      console.info(`getDisconnect: Token ${token} deleted successfully for user ${user.email}`);
      return response.status(204).json();
    } catch (error) {
      console.error(`getDisconnect: Internal server error - ${error.message}`, error);
      return response.status(500).json({
        status: STATUS_ERROR,
        message: `${MSG_INTERNAL_ERROR}: ${error.message}`,
        data: null,
      });
    }
  }

  /**
   * Retrieves the information of the authenticated user.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async getMe(request, response) {
    try {
      const token = request.headers["auth-token"];
      if (!token) {
        const msg = "No auth-token provided in headers";
        console.error(`getMe: ${msg}`);
        return response.status(401).json({
          status: STATUS_ERROR,
          message: msg,
          data: null,
        });
      }

      const key = `${AUTH_PREFIX}${token}`;
      const userID = await redisClient.get(key);
      if (!userID) {
        const msg = `Token ${token} is invalid or expired`;
        console.error(`getMe: ${msg}`);
        return response.status(401).json({
          status: STATUS_ERROR,
          message: MSG_INVALID_TOKEN,
          data: null,
        });
      }

      const user = await dbClient.fetchUserByID(userID);
      if (!user) {
        const msg = `User with ID ${userID} not found`;
        console.error(`getMe: ${msg}`);
        return response.status(404).json({
          status: STATUS_ERROR,
          message: MSG_USER_NOT_FOUND,
          data: null,
        });
      }

      console.info(`getMe: User ${user.email} retrieved successfully`);
      return response.status(200).json({
        status: STATUS_SUCCESS,
        message: MSG_USER_FETCHED,
        data: {
          id: user._id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      console.error(`getMe: Internal server error - ${error.message}`, error);
      return response.status(500).json({
        status: STATUS_ERROR,
        message: `${MSG_INTERNAL_ERROR}: ${error.message}`,
        data: null,
      });
    }
  }
}

export default AuthController;
