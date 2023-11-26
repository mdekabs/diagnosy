import sha1 from "sha1";
import dbClient from "../storage/db";
import { ObjectId } from 'mongodb';

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
    /**
     * Destructuring user data from the request body.
     * @type {Object}
     */
    const { email, password, username } = request.body;

    if (!email) {
      response.status(400).json({ error: "Missing email" }).end();
    } else if (!username) {
      response.status(400).json({ error: "Missing username" }).end();
    } else if (!password) {
      response.status(400).json({ error: "Missing password" }).end();
    } else if ((await dbClient.fetchUserByEmail({ email })) !== null) {
      response.status(400).json({ error: "User already exists" }).end();
    } else {
      /**
       * Hashed password using the sha1 algorithm.
       * @type {string}
       */
      const hashedPassword = sha1(password);

      /**
       * The unique identifier for the newly created user.
       * @type {string}
       */
      const userID = await dbClient.createUser({
        email,
        username,
        password: hashedPassword,
      });

      const systemMessage = "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that";
      const chatID = await dbClient.createChatHistory({
        userID: new ObjectId(userID),
        history: [{role: "system", content: systemMessage}]
      });

      response.status(201).json({ status: "User Created Successfully!", id: userID, email, username, chatID }).end();
    }
  }
}

export default UsersController;
