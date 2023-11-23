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
    this.client.get = promisify(this.client.get).bind(this.client);
    this.client.set = promisify(this.client.set).bind(this.client);
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
    console.log(await this.client.ping("Ready"));
    console.log(await this.client.get("mike"));
    return this.client.get(key);
  }

  async set(key, value, duration) {
    this.client.set(key, value, "EX", duration);
  }

  async del(key) {
    return this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
