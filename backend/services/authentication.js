import User from "../models/user.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import uuid from "../utils/uuid.js";
import { emailQueue } from "../jobs/queues/email_queue.js";
import { generatePasswordResetEmail } from "../utils/index.js";
import { updateBlacklist } from "../middleware/index.js";
import redisClient from "../config/redis.js";
import { ChatService } from "./chat.js";
import { logger } from "../config/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = "1d";
const PASSWORD_RESET_EXPIRATION = 3600000;
const TOKEN_BYTES = 32;
const GUEST_TOKEN_EXPIRATION = "1h";

export class AuthService {
  static async createUser({ username, email, password, guestId }) {
    if (!username || !email || !password) {
      throw new Error("Username, email, and password are required.");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email is already in use.");
    }

    const newUser = new User({ username, email, password });
    const user = await newUser.save();
    const accessToken = jwt.sign({ id: user._id.toString(), isAdmin: user.isAdmin }, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION,
    });

    if (guestId) {
      try {
        await ChatService.mergeGuestHistory(user._id.toString(), guestId);
        logger.info(`createUser: Merged guest history for guestId ${guestId} to userID ${user._id}`);
      } catch (err) {
        logger.error(`createUser: Failed to merge guest history for guestId ${guestId}: ${err.message}`);
        // Continue with user creation even if merging fails
      }
    }

    logger.info(`User registered: ${user._id}`);
    return { userId: user._id.toString(), token: accessToken };
  }

  static async loginUser({ username, password, guestId }) {
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const user = await User.findOne({ username });
    if (!user) {
      throw new Error("Invalid username or password.");
    }

    if (!user.canLogin()) {
      throw new Error(`Account locked. Try again after ${new Date(user.lockUntil).toLocaleTimeString()}`);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new Error("Incorrect password.");
    }

    await user.resetLoginAttempts();
    const accessToken = jwt.sign({ id: user._id.toString(), isAdmin: user.isAdmin }, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION,
    });

    if (guestId) {
      try {
        await ChatService.mergeGuestHistory(user._id.toString(), guestId);
        logger.info(`loginUser: Merged guest history for guestId ${guestId} to userID ${user._id}`);
      } catch (err) {
        logger.error(`loginUser: Failed to merge guest history for guestId ${guestId}: ${err.message}`);
        // Continue with login even if merging fails
      }
    }

    logger.info(`User logged in: ${user._id}`);
    return { userId: user._id.toString(), token: accessToken };
  }

  static async logoutUser(token) {
    if (!token) {
      throw new Error("Token is required.");
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
      throw new Error("User not found.");
    }

    const resetToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + PASSWORD_RESET_EXPIRATION;
    await user.save();

    await emailQueue.add("sendEmail", generatePasswordResetEmail(user.email, resetToken));
    logger.info(`Password reset initiated for user: ${user._id}`);
  }

  static async resetPassword({ token, newPassword }) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      throw new Error("Invalid or expired token.");
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
      const token = jwt.sign({ guestId, isGuest: true }, JWT_SECRET, {
        expiresIn: GUEST_TOKEN_EXPIRATION,
      });
      await redisClient.set(`guest_${guestId}`, token, "EX", 3600);
      logger.info(`Generated guest ID: ${guestId}`);
      return { guestId, token };
    } catch (err) {
      logger.error(`Failed to generate guest ID: ${err.message}`);
      throw new Error(`Failed to generate guest ID: ${err.message}`);
    }
  }
}
