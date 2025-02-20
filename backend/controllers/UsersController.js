import sha1 from "sha1";
import dbClient from "../storage/db";
import { ObjectId } from "mongodb";

// Constants for error messages
const ERRORS = {
  MISSING_EMAIL: "Missing email",
  MISSING_USERNAME: "Missing username",
  MISSING_PASSWORD: "Missing password",
  USER_EXISTS: "User already exists",
  SERVER_ERROR: "Internal Server Error",
};

// System message for new users
const SYSTEM_MESSAGE = {
  role: "system",
  content:
    "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. " +
    "You provide preliminary medical diagnoses and advice based on symptoms " +
    "and help schedule medical appointments. Would you like assistance with that?",
};

/**
 * Class representing the controller for user-related operations.
 */
class UsersController {
  /**
   * Handles the creation of a new user.
   *
   * @static
   * @async
   * @param {Object} request - The request object containing user data.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async postNew(request, response) {
    try {
      // Destructure user data from request body
      const { email, password, username } = request.body;

      if (!email) return response.status(400).json({ error: ERRORS.MISSING_EMAIL });
      if (!username) return response.status(400).json({ error: ERRORS.MISSING_USERNAME });
      if (!password) return response.status(400).json({ error: ERRORS.MISSING_PASSWORD });

      // Check if user already exists
      const existingUser = await dbClient.fetchUserByEmail({ email });
      if (existingUser) {
        return response.status(400).json({ error: ERRORS.USER_EXISTS });
      }

      // Hash the password
      const hashedPassword = sha1(password);

      // Create a new user in the database
      const userID = await dbClient.createUser({
        email,
        username,
        password: hashedPassword,
      });

      // Create chat history for the new user
      const chatID = await dbClient.createChatHistory({
        userID: new ObjectId(userID),
        history: [SYSTEM_MESSAGE],
      });

      return response.status(201).json({
        status: "User Created Successfully!",
        id: userID,
        email,
        username,
        chatID,
      });
    } catch (error) {
      console.error("postNew: Error creating user:", error);
      return response.status(500).json({ status: "error", message: ERRORS.SERVER_ERROR });
    }
  }
}

export default UsersController;
