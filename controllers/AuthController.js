import { v4 as uuidv4 } from "uuid";
import dbClient from "../storage/db";
import redisClient from "../storage/redis";
import sha1 from "sha1";

/**
 * Class representing the authentication controller.
 */
class AuthController {
  /**
   * Authenticates a user and generates a token upon successful sign-in.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async getConnect(request, response) {
    const { email, password } = request.body;
    const user = await dbClient.fetchUserByEmail({ email });

    if (user) {
      const hashedPassword = sha1(password);

      if (hashedPassword === user.password) {
        try {
          const token = uuidv4();
          const key = `auth_${token}`;
          await redisClient.set(key, user._id.toString(), 86400);

          response
            .status(200)
            .json({
              status: "success",
              message: "Sign in successful",
              data: { token },
            })
            .end();
        } catch (error) {
          console.error(error);
          response
            .status(504)
            .json({ status: "error", message: error.message, data: null })
            .end();
        }
      } else {
        response
          .status(401)
          .json({
            status: "error",
            message: "Incorrect password",
            data: null,
          })
          .end();
      }
    } else {
      response
        .status(401)
        .json({
          status: "error",
          message: "User does not exist",
          data: null,
        })
        .end();
    }
  }

  /**
   * Logs out a user by deleting their authentication token.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async getDisconnect(request, response) {
    const token = request.headers["auth-token"];
    const key = `auth_${token}`;
    const userID = await redisClient.get(key);

    if (!userID) {
      response
        .status(401)
        .json({
          status: "error",
          message: "Invalid token",
          data: null,
        })
        .end();
    } else {
      const user = await dbClient.fetchUserByID(userID);

      if (!user) {
        response
          .status(404)
          .json({
            status: "error",
            message: "Invalid token",
            data: null,
          })
          .end();
      } else {
        await redisClient.del(key);
        response.status(204).json().end();
      }
    }
  }

  /**
   * Retrieves the information of the authenticated user.
   *
   * @async
   * @param {Object} request - The request object.
   * @param {Object} response - The response object.
   * @returns {Promise<void>}
   */
  static async getMe(request, response) {
    const token = request.headers["auth-token"];
    const key = `auth_${token}`;

    try {
      const userID = await redisClient.get(key);

      if (!userID) {
        response
          .status(401)
          .json({
            status: "error",
            message: "Invalid token",
            data: null,
          })
          .end();
      } else {
        const user = await dbClient.fetchUserByID(userID);

        if (!user) {
          response
            .status(404)
            .json({
              status: "error",
              message: "User not found",
              data: null,
            })
            .end();
        } else {
          response
            .status(200)
            .json({
              status: "success",
              message: "Current user fetched successfully",
              data: {
                id: user._id,
                email: user.email,
                username: user.username,
              },
            })
            .end();
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
}

export default AuthController;
