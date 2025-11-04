import jwt from "jsonwebtoken";
import crypto from "crypto";
import { emailQueue } from "../jobs/queues/email_queue.js";
import { generatePasswordResetEmail } from "../utils/index.js";
import { updateBlacklist } from "../middleware/index.js";
import User from "../models/user.js";
import { logger } from "../config/index.js";

// --- Constants ---
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = "1d"; // Access token lifetime
const PASSWORD_RESET_EXPIRATION = 3600000; // 1 hour in ms
const TOKEN_BYTES = 32;

/**
 * AuthService
 * -------------------------------------------------------------
 * Handles registration, login, logout, password recovery,
 * and authenticated user retrieval.
 * -------------------------------------------------------------
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async createUser({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error("Username, email, and password are required.");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email is already in use.");
    }

    const newUser = new User({ username, email, password });
    const savedUser = await newUser.save();

    logger.info(`User registered successfully: ${savedUser._id}`);
    return { status: "success", message: "User registered successfully" };
  }

  /**
   * Login user (stateless session)
   * - Verifies credentials
   * - Updates login attempts and lastLogin timestamp
   * - Returns JWT signed with session timestamp
   */
  static async loginUser({ username, password }) {
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const user = await User.findOne({ username });
    if (!user) {
      throw new Error("Invalid username or password.");
    }

    // Check lock state
    if (!user.canLogin()) {
      throw new Error(
        `Account locked. Try again after ${new Date(
          user.lockUntil
        ).toLocaleTimeString()}`
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new Error("Incorrect password.");
    }

    // Reset login attempts & update lastLogin in the model
    const { currentLoginTime } = await User.recordLoginSuccess(user._id);

    // Generate JWT with embedded session timestamp
    const accessToken = jwt.sign(
      {
        id: user._id.toString(),
        isAdmin: user.isAdmin,
        iat_session: currentLoginTime, // timestamp used for stateless validation
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    logger.info(`User login successful: ${user._id}`);
    return {
      status: "success",
      message: "Login successful",
      data: { userId: user._id.toString(), token: accessToken },
    };
  }

  /**
   * Logout user (adds token to Redis blacklist)
   */
  static async logoutUser(token) {
    if (!token) throw new Error("Token is required.");

    try {
      await updateBlacklist(token);
      logger.info("User logged out — token blacklisted.");
      return { status: "success", message: "Logout successful" };
    } catch (err) {
      logger.error(`Logout failed: ${err.message}`);
      throw new Error(`Logout failed: ${err.message}`);
    }
  }

  /**
   * Initiate password reset via email queue
   */
  static async forgotPassword(email) {
    if (!email) throw new Error("Email is required.");

    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found.");

    // Generate and assign reset token
    const resetToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + PASSWORD_RESET_EXPIRATION;
    await user.save();

    // Queue password reset email
    await emailQueue.add(
      "sendEmail",
      generatePasswordResetEmail(user.email, resetToken)
    );

    logger.info(`Password reset requested for user: ${user._id}`);
    return {
      status: "success",
      message: "Password reset email sent successfully.",
    };
  }

  /**
   * Complete password reset process
   */
  static async resetPassword({ token, newPassword }) {
    if (!token || !newPassword) {
      throw new Error("Token and new password are required.");
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) throw new Error("Invalid or expired reset token.");

    // Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user._id}`);
    return { status: "success", message: "Password reset successful." };
  }

  /**
   * Get authenticated user details (lightweight)
   */
  static async getMe(userId) {
    if (!userId) throw new Error("Invalid or missing user token.");

    const user = await User.findById(userId).select("username email");
    if (!user) throw new Error("User not found.");

    logger.info(`Retrieved profile for userId: ${userId}`);
    return {
      status: "success",
      message: "User details retrieved successfully.",
      data: {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    };
  }
}

