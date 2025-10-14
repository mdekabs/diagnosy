import HttpStatus from "http-status-codes";
import { AuthService } from "../services/authentication.js";
import { responseHandler } from "../utils/index.js";
import { logger } from "../config/logger.js";

export class AuthController {
  static async generateGuestId(req, res) {
    try {
      const data = await AuthService.generateGuestId();
      responseHandler(res, HttpStatus.OK, "success", "Guest ID and token generated successfully", data);
    } catch (err) {
      logger.error(`Generate guest ID failed: ${err.message}`);
      responseHandler(res, HttpStatus.INTERNAL_SERVER_ERROR, "error", err.message);
    }
  }

  static async register(req, res) {
    try {
      const { username, email, password, guestId } = req.body;
      const data = await AuthService.createUser({ username, email, password, guestId });
      responseHandler(res, HttpStatus.OK, "success", "Registration successful", data);
    } catch (err) {
      const status = err.message.includes("Email is already in use") ? HttpStatus.CONFLICT :
                     HttpStatus.INTERNAL_SERVER_ERROR;
      logger.error(`Register failed: ${err.message}`);
      responseHandler(res, status, "error", err.message);
    }
  }

  static async login(req, res) {
    try {
      const { username, password, guestId } = req.body;
      const data = await AuthService.loginUser({ username, password, guestId });
      responseHandler(res, HttpStatus.OK, "success", "Login successful", data);
    } catch (err) {
      const status = err.message.includes("Invalid username or password") || 
                     err.message.includes("Incorrect password") ? HttpStatus.UNAUTHORIZED :
                     err.message.includes("Account locked") ? HttpStatus.FORBIDDEN :
                     HttpStatus.INTERNAL_SERVER_ERROR;
      logger.error(`Login failed: ${err.message}`);
      responseHandler(res, status, "error", err.message);
    }
  }

  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      await AuthService.logoutUser(token);
      responseHandler(res, HttpStatus.OK, "success", "Logout successful");
    } catch (err) {
      logger.error(`Logout failed: ${err.message}`);
      responseHandler(res, HttpStatus.INTERNAL_SERVER_ERROR, "error", err.message);
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      responseHandler(res, HttpStatus.OK, "success", "Password reset email sent.");
    } catch (err) {
      logger.error(`Forgot password failed: ${err.message}`);
      responseHandler(res, HttpStatus.NOT_FOUND, "error", err.message);
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetPassword({ token, newPassword });
      responseHandler(res, HttpStatus.OK, "success", "Password reset successful.");
    } catch (err) {
      logger.error(`Reset password failed: ${err.message}`);
      responseHandler(res, HttpStatus.BAD_REQUEST, "error", err.message);
    }
  }
}

export default AuthController;
