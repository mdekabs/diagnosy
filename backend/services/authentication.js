import jwt from "jsonwebtoken"
import crypto from 'crypto';
import uuid from '../utils/uuid.js';
import { emailQueue } from '../jobs/queues/email_queue.js';
import { generatePasswordResetEmail } from '../utils/index.js';
import { updateBlacklist } from '../middleware/index.js';
import redisClient from '../config/redis.js';
import User from '../models/user.js';
import { logger } from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '1d';
const PASSWORD_RESET_EXPIRATION = 3600000;
const TOKEN_BYTES = 32;
const GUEST_TOKEN_EXPIRATION = 3600; // 1 hour in seconds

export class AuthService {
  static async createUser({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required.');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email is already in use.');
    }

    const newUser = new User({ username, email, password });
    const user = await newUser.save();
    const accessToken = jwt.sign({ id: user._id.toString(), isAdmin: user.isAdmin }, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION,
    });

    logger.info(`User registered: ${user._id}`);
    return { userId: user._id.toString(), token: accessToken };
  }

  static async loginUser({ username, password }) {
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('Invalid username or password.');
    }

    if (!user.canLogin()) {
      throw new Error(`Account locked. Try again after ${new Date(user.lockUntil).toLocaleTimeString()}`);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new Error('Incorrect password.');
    }

    await user.resetLoginAttempts();
    const accessToken = jwt.sign({ id: user._id.toString(), isAdmin: user.isAdmin }, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION,
    });

    logger.info(`User logged in: ${user._id}`);
    return { userId: user._id.toString(), token: accessToken };
  }

  static async logoutUser(token) {
    if (!token) {
      throw new Error('Token is required.');
    }
    try {
      await updateBlacklist(token);
      logger.info(`User logged out, token blacklisted`);
    } catch (err) {
      logger.error(`Logout failed: ${err.message}`);
      throw new Error(`Logout failed: ${err.message}`);
    }
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found.');
    }

    const resetToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + PASSWORD_RESET_EXPIRATION;
    await user.save();

    await emailQueue.add('sendEmail', generatePasswordResetEmail(user.email, resetToken));
    logger.info(`Password reset initiated for user: ${user._id}`);
  }

  static async resetPassword({ token, newPassword }) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      throw new Error('Invalid or expired token.');
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    logger.info(`Password reset successful for user: ${user._id}`);
  }

  static async generateGuestId() {
    try {
      const guestId = uuid.generate();
      await redisClient.set(`guest_${guestId}`, 'active', 'EX', GUEST_TOKEN_EXPIRATION);
      logger.info(`Generated guest ID: ${guestId}`);
      return { guestId };
    } catch (err) {
      logger.error(`Failed to generate guest ID: ${err.message}`);
      throw new Error(`Failed to generate guest ID: ${err.message}`);
    }
  }

  static async getGuestId(guestId) {
    try {
      if (!guestId) {
        throw new Error('Invalid or missing guest ID');
      }
      const status = await redisClient.get(`guest_${guestId}`);
      if (!status) {
        throw new Error('Guest ID not found or expired');
      }
      const chatData = await redisClient.get(`guest_chat:${guestId}`);
      logger.info(`Retrieved guestId: ${guestId}${chatData ? ' with chat history' : ''}`);
      return {
        status: 'success',
        message: 'Guest ID retrieved successfully',
        data: { guestId },
      };
    } catch (err) {
      logger.error(`getGuestId: ${err.message}`);
      throw err;
    }
  }

  static async getMe(userId) {
    try {
      if (!userId) {
        throw new Error('Invalid or missing user token');
      }
      const user = await User.findById(userId).select('username email');
      if (!user) {
        throw new Error('User not found');
      }
      logger.info(`Retrieved user details for userId: ${userId}`);
      return {
        status: 'success',
        message: 'User details retrieved successfully',
        data: {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
        },
      };
    } catch (err) {
      logger.error(`getMe: ${err.message}`);
      throw err;
    }
  }
}
