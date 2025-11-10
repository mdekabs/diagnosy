import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { emailQueue } from '../jobs/queues/email_queue.js';
import { generatePasswordResetEmail } from '../utils/index.js';
import { updateBlacklist } from '../middleware/index.js';
import User from '../models/user.js';
import { logger } from '../config/index.js';

// --- Constants ---
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRATION = '1d';
const PASSWORD_RESET_EXPIRATION = 3600000; // 1 hour in ms
const TOKEN_BYTES = 32;
const ERRORS = {
  MISSING_FIELDS: 'Username, email, and password are required.',
  EMAIL_IN_USE: 'Email is already in use.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  ACCOUNT_LOCKED: (time) => `Account locked. Try again after ${time}.`,
  MISSING_TOKEN: 'Token is required.',
  INVALID_TOKEN: 'Invalid or expired reset token.',
  MISSING_TOKEN_PASSWORD: 'Token and new password are required.',
  USER_NOT_FOUND: 'User not found.',
  INVALID_USER_TOKEN: 'Invalid or missing user token.',
  LOGOUT_FAILED: (msg) => `Logout failed: ${msg}`,
};

/**
 * @typedef {Object} UserCredentials
 * @property {string} username - User's username
 * @property {string} email - User's email address
 * @property {string} password - User's password
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} username - User's username
 * @property {string} password - User's password
 */

/**
 * @typedef {Object} ResetPasswordData
 * @property {string} token - Password reset token
 * @property {string} newPassword - New password to set
 */

/**
 * AuthService
 * @class
 * @description Manages user authentication operations: registration, login, logout, password recovery, and user details retrieval.
 */
export const AuthService = {
  /**
   * Registers a new user with provided credentials
   * @async
   * @param {UserCredentials} credentials - User registration data
   * @returns {Promise<{status: string, message: string}>} Registration result
   * @throws {Error} If credentials are incomplete or email is in use
   */
  createUser: async ({ username, email, password } = {}) => {
    if (!username || !email || !password) throw new Error(ERRORS.MISSING_FIELDS);

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) throw new Error(ERRORS.EMAIL_IN_USE);

    const user = await new User({ username, email, password }).save();
    logger.info(`User registered: ${user._id}`);
    return { status: 'success', message: 'User registered successfully' };
  },

  /**
   * Authenticates a user and generates a JWT token
   * @async
   * @param {LoginCredentials} credentials - User login credentials
   * @returns {Promise<{status: string, message: string, data: {userId: string, token: string}}>} Login result
   * @throws {Error} If credentials are invalid or account is locked
   */
  loginUser: async ({ username, password } = {}) => {
    if (!username || !password) throw new Error(ERRORS.MISSING_FIELDS);

    const user = await User.findOne({ username }).exec();
    if (!user) throw new Error(ERRORS.INVALID_CREDENTIALS);

    if (!user.canLogin()) {
      throw new Error(ERRORS.ACCOUNT_LOCKED(new Date(user.lockUntil).toLocaleTimeString()));
    }

    if (!(await user.comparePassword(password))) {
      await user.incrementLoginAttempts();
      throw new Error(ERRORS.INVALID_CREDENTIALS);
    }

    const { currentLoginTime } = await User.recordLoginSuccess(user._id);
    const token = jwt.sign(
      { id: user._id.toString(), isAdmin: user.isAdmin ?? false, iat_session: currentLoginTime },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    logger.info(`User login: ${user._id}`);
    return {
      status: 'success',
      message: 'Login successful',
      data: { userId: user._id.toString(), token },
    };
  },

  /**
   * Logs out a user by blacklisting their token
   * @async
   * @param {string} token - JWT token to blacklist
   * @returns {Promise<{status: string, message: string}>} Logout result
   * @throws {Error} If token is missing or blacklisting fails
   */
  logoutUser: async (token) => {
    if (!token) throw new Error(ERRORS.MISSING_TOKEN);

    try {
      await updateBlacklist(token);
      logger.info('User logged out: token blacklisted');
      return { status: 'success', message: 'Logout successful' };
    } catch (err) {
      logger.error(ERRORS.LOGOUT_FAILED(err.message));
      throw new Error(ERRORS.LOGOUT_FAILED(err.message));
    }
  },

  /**
   * Initiates password reset process by sending reset email
   * @async
   * @param {string} email - User's email address
   * @returns {Promise<{status: string, message: string}>} Password reset initiation result
   * @throws {Error} If email is missing or user not found
   */
  forgotPassword: async (email) => {
    if (!email) throw new Error(ERRORS.MISSING_FIELDS);

    const user = await User.findOne({ email }).exec();
    if (!user) throw new Error(ERRORS.USER_NOT_FOUND);

    const resetToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpires: Date.now() + PASSWORD_RESET_EXPIRATION,
      }
    ).exec();

    await emailQueue.add('sendEmail', generatePasswordResetEmail(user.email, resetToken));
    logger.info(`Password reset requested: ${user._id}`);
    return { status: 'success', message: 'Password reset email sent successfully' };
  },

  /**
   * Completes password reset with provided token and new password
   * @async
   * @param {ResetPasswordData} data - Password reset data
   * @returns {Promise<{status: string, message: string}>} Password reset result
   * @throws {Error} If token or new password is missing or invalid
   */
  resetPassword: async ({ token, newPassword } = {}) => {
    if (!token || !newPassword) throw new Error(ERRORS.MISSING_TOKEN_PASSWORD);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).exec();

    if (!user) throw new Error(ERRORS.INVALID_TOKEN);

    await User.updateOne(
      { _id: user._id },
      { password: newPassword, resetPasswordToken: undefined, resetPasswordExpires: undefined }
    ).exec();

    logger.info(`Password reset: ${user._id}`);
    return { status: 'success', message: 'Password reset successful' };
  },

  /**
   * Retrieves authenticated user details
   * @async
   * @param {string} userId - ID of the authenticated user
   * @returns {Promise<{status: string, message: string, data: {userId: string, username: string, email: string}}>} User details
   * @throws {Error} If userId is invalid or user not found
   */
  getMe: async (userId) => {
    if (!userId) throw new Error(ERRORS.INVALID_USER_TOKEN);

    const user = await User.findById(userId).select('username email').exec();
    if (!user) throw new Error(ERRORS.USER_NOT_FOUND);

    logger.info(`Profile retrieved: ${userId}`);
    return {
      status: 'success',
      message: 'User details retrieved successfully',
      data: { userId: user._id.toString(), username: user.username, email: user.email },
    };
  },
};
