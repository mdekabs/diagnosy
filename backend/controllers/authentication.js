import HttpStatus from 'http-status-codes';
import { AuthService } from '../services/index.js';
import { responseHandler } from '../utils/index.js';
import { logger } from '../config/index.js';

// --- Constants ---
const ERROR_STATUSES = {
  'Invalid or missing user token': HttpStatus.UNAUTHORIZED,
  'User not found': HttpStatus.NOT_FOUND,
  'Email is already in use': HttpStatus.CONFLICT,
  'Invalid username or password': HttpStatus.UNAUTHORIZED,
  'Incorrect password': HttpStatus.UNAUTHORIZED,
  'Account locked': HttpStatus.FORBIDDEN,
  'Token is required': HttpStatus.BAD_REQUEST,
  'Invalid or expired reset token': HttpStatus.BAD_REQUEST,
  'Username, email, and password are required': HttpStatus.BAD_REQUEST,
  'Token and new password are required': HttpStatus.BAD_REQUEST,
};

/**
 * @typedef {Object} ResponseData
 * @property {string} status - Response status ('success' or 'error')
 * @property {string} message - Response message
 * @property {Object} [data] - Optional response data
 */

/**
 * AuthController
 * @description Handles HTTP requests for authentication operations, interfacing with AuthService.
 */
export const AuthController = {
  /**
   * Retrieves authenticated user details
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with user details or error
   */
  getMe: async (req, res) => {
    try {
      const result = await AuthService.getMe(req.userID);
      responseHandler(res, HttpStatus.OK, result.status, result.message, result.data);
    } catch (err) {
      logger.error(`getMe failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

  /**
   * Registers a new user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with registration result or error
   */
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const data = await AuthService.createUser({ username, email, password });
      responseHandler(res, HttpStatus.OK, 'success', 'Registration successful', data);
    } catch (err) {
      logger.error(`Register failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

  /**
   * Logs in a user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with login result or error
   */
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const data = await AuthService.loginUser({ username, password });
      responseHandler(res, HttpStatus.OK, 'success', 'Login successful', data);
    } catch (err) {
      logger.error(`Login failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

  /**
   * Logs out a user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with logout result or error
   */
  logout: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      await AuthService.logoutUser(token);
      responseHandler(res, HttpStatus.OK, 'success', 'Logout successful');
    } catch (err) {
      logger.error(`Logout failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

  /**
   * Initiates password reset process
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with password reset initiation result or error
   */
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      responseHandler(res, HttpStatus.OK, 'success', 'Password reset email sent');
    } catch (err) {
      logger.error(`Forgot password failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.NOT_FOUND;
      responseHandler(res, status, 'error', err.message);
    }
  },

  /**
   * Completes password reset
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} Responds with password reset result or error
   */
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetPassword({ token, newPassword });
      responseHandler(res, HttpStatus.OK, 'success', 'Password reset successful');
    } catch (err) {
      logger.error(`Reset password failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.BAD_REQUEST;
      responseHandler(res, status, 'error', err.message);
    }
  },
};

export default AuthController;
