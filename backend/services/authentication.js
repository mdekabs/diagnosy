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

export const AuthService = {
  /**
   * Registers a new user
   * @param {Object} payload
   * @param {string} payload.username
   * @param {string} payload.email
   * @param {string} payload.password
   */
  createUser: async (payload = {}) => {
    const { username, email, password } = payload;

    if (!username || !email || !password) throw new Error(ERRORS.MISSING_FIELDS);

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) throw new Error(ERRORS.EMAIL_IN_USE);

    const user = await new User({ username, email, password }).save();
    logger.info(`User registered: ${user._id}`);

    return { status: 'success', message: 'User registered successfully' };
  },

  /**
   * Logs in a user
   * @param {Object} payload
   * @param {string} payload.username
   * @param {string} payload.password
   */
  loginUser: async (payload = {}) => {
    const { username, password } = payload;

    if (!username || !password) throw new Error(ERRORS.MISSING_FIELDS);

    const user = await User.findOne({ username }).exec();
    if (!user) throw new Error(ERRORS.INVALID_CREDENTIALS);

    if (!user.canLogin()) {
      throw new Error(
        ERRORS.ACCOUNT_LOCKED(new Date(user.lockUntil).toLocaleTimeString())
      );
    }

    if (!(await user.comparePassword(password))) {
      await user.incrementLoginAttempts();
      throw new Error(ERRORS.INVALID_CREDENTIALS);
    }

    const { currentLoginTime } = await User.recordLoginSuccess(user._id);

    const token = jwt.sign(
      {
        id: user._id.toString(),
        isAdmin: user.isAdmin ?? false,
        iat_session: currentLoginTime,
      },
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
   * Logout user – token blacklist
   * @param {Object} payload
   * @param {string} payload.token
   */
  logoutUser: async (payload = {}) => {
    const { token } = payload;

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
   * Forgot Password
   * @param {Object} payload
   * @param {string} payload.email
   */
  forgotPassword: async (payload = {}) => {
    const { email } = payload;

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

    await emailQueue.add(
      'sendEmail',
      generatePasswordResetEmail(user.email, resetToken)
    );

    logger.info(`Password reset requested: ${user._id}`);

    return {
      status: 'success',
      message: 'Password reset email sent successfully',
    };
  },

  /**
   * Reset Password
   * @param {Object} payload
   * @param {string} payload.token
   * @param {string} payload.newPassword
   */
  resetPassword: async (payload = {}) => {
    const { token, newPassword } = payload;

    if (!token || !newPassword) throw new Error(ERRORS.MISSING_TOKEN_PASSWORD);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).exec();

    if (!user) throw new Error(ERRORS.INVALID_TOKEN);

    await User.updateOne(
      { _id: user._id },
      {
        password: newPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      }
    ).exec();

    logger.info(`Password reset: ${user._id}`);

    return { status: 'success', message: 'Password reset successful' };
  },

  /**
   * Get current user
   * @param {Object} payload
   * @param {string} payload.userId
   */
  getMe: async (payload = {}) => {
    const { userId } = payload;

    if (!userId) throw new Error(ERRORS.INVALID_USER_TOKEN);

    const user = await User.findById(userId)
      .select('username email')
      .exec();

    if (!user) throw new Error(ERRORS.USER_NOT_FOUND);

    logger.info(`Profile retrieved: ${userId}`);

    return {
      status: 'success',
      message: 'User details retrieved successfully',
      data: {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    };
  },
};
