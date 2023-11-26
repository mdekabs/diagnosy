import { createClient } from "redis";
import { promisify } from "util";

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.connect();
    this.alive = true;
    this.client.on("error", (error) => {
      console.log(error);
      this.alive = false;
    });

    this.client.once("ready", () => {
      this.alive = true;
      console.log("ready");
    });
  }

  async init() {
    this.client = await createClient()
      .on("error", (err) => console.log("Redis Client Error", err))
      .connect();

    this.client.on("ready", () => {
      console.log("ready");
    });
  }

  isAlive() {
    return this.alive;
  }

  async get(key) {
    try {
      this.client.set = await promisify(this.client.get).bind(this.client);
      return this.client.get(key);
    } catch (error) {
      console.log(error);
    }
  }

  async set(key, value, duration) {
    try {
      // this.client.set = await promisify(this.client.set).bind(this.client);
      await this.client.set(key, value, "EX", duration);
    } catch (error) {
      console.log(error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.log(error);
    }
  }
}

const redisClient = new RedisClient();

export default redisClient;
