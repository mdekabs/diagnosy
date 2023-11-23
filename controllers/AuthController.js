import { atob } from "buffer";
import { v4 as uuidv4 } from "uuid";
import dbClient from "../storage/db";
import redisClient from "../storage/redis";
import sha1 from "sha1";

class AuthController {
  static async getConnect(request, response) {
    const { email, password } = request.body;
    const user = await dbClient.fetchUserByEmail({ email });
    if (user) {
      const hashedPassword = sha1(password);
      if (hashedPassword === user.password) {
        try {
          const token = uuidv4();
          const key = `auth_${token}`;
          const reply = await redisClient.set(key, user._id.toString(), 86400);
          console.log(reply);
          response
            .status(200)
            .json({ status: "success", message: "Sign in successful", token })
            .end();
        } catch (error) {
          console.error(error);
          response
            .status(501)
            .json({ status: "error", message: error.message })
            .end();
        }
      } else {
        response
          .status(401)
          .json({ status: "error", message: "Unauthorized" })
          .end();
      }
    } else {
      response
        .status(401)
        .json({ status: "error", message: "Unauthorized" })
        .end();
    }
  }

  static async getDisconnect(request, response) {
    const token = request.headers["x-token"];
    const key = `auth_${token}`;
    const userID = await redisClient.get(key);
    if (!userID) {
      response.status(401).json({ error: "Unauthorized" }).end();
    } else {
      const user = await dbClient.fetchUserByID(userID);

      if (!user) {
        response.status(401).json({ error: "Unauthorized" }).end();
      } else {
        const reply = await redisClient.del(key);
        console.log(reply);
        response.status(204).json().end();
      }
    }
  }

  static async getMe(request, response) {
    const token = request.headers["x-token"];
    const key = `auth_${token}`;
    const userID = await redisClient.get(key);
    console.log(userID)
    if (!userID) {
      response.status(401).json({ error: "Unauthorized" }).end();
    } else {
      const user = await dbClient.fetchUserByID(userID);

      if (!user) {
        response.status(401).json({ error: "Unauthorized" }).end();
      } else {
        response
          .status(200)
          .json({
            id: user._id,
            email: user.email,
          })
          .end();
      }
    }
  }
}

export default AuthController;
