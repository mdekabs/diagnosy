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

export const AuthController = {
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

  register: async (req, res) => {
    try {
      const result = await AuthService.createUser(req.body);
      responseHandler(res, HttpStatus.OK, 'success', 'Registration successful', result);
    } catch (err) {
      logger.error(`Register failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

  login: async (req, res) => {
    try {
      const result = await AuthService.loginUser(req.body);
      responseHandler(res, HttpStatus.OK, 'success', 'Login successful', result);
    } catch (err) {
      logger.error(`Login failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.INTERNAL_SERVER_ERROR;
      responseHandler(res, status, 'error', err.message);
    }
  },

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

  forgotPassword: async (req, res) => {
    try {
      await AuthService.forgotPassword(req.body.email);
      responseHandler(res, HttpStatus.OK, 'success', 'Password reset email sent');
    } catch (err) {
      logger.error(`Forgot password failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.NOT_FOUND;
      responseHandler(res, status, 'error', err.message);
    }
  },

  resetPassword: async (req, res) => {
    try {
      await AuthService.resetPassword(req.body);
      responseHandler(res, HttpStatus.OK, 'success', 'Password reset successful');
    } catch (err) {
      logger.error(`Reset password failed: ${err.message}`);
      const status = ERROR_STATUSES[err.message] || HttpStatus.BAD_REQUEST;
      responseHandler(res, status, 'error', err.message);
    }
  },
};

export default AuthController;
