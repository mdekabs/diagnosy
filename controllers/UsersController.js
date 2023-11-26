import sha1 from "sha1";
import dbClient from "../storage/db";

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

      response.status(201).json({ status: "User Created Successfully!", id: userID, email, username }).end();
    }
  }
}

export default UsersController;
