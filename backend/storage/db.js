import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { config } from "dotenv";

/**
 * Loads environment variables from the .env file.
 */
config();

/**
 * Class representing the MongoDB Database Client.
 */
class DBClient {
  /**
   * Creates an instance of the DBClient.
   * Establishes a connection to the MongoDB database.
   */
  constructor() {
    /**
     * Retrieves the database name from the environment variables.
     *
     * @type {string}
     */
    const database = process.env.DB;

    /**
     * Indicates the connection status to the database.
     *
     * @type {boolean}
     */
    this.isConnected = false;

    /**
     * Represents the MongoDB users collection.
     *
     * @type {Collection | null}
     */
    this.usersCollection = null;

    /**
     * Represents the MongoDB chats collection.
     *
     * @type {Collection | null}
     */
    this.chatsCollection = null;

    /**
     * Retrieves the database password from the environment variables.
     *
     * @type {string}
     */
    const password = process.env.DB_PASSWORD;

    /**
     * Constructs the MongoDB connection URI.
     *
     * @type {string}
     */
    const uri = `mongodb+srv://MikeRock:${password}@cluster0.qyotcp1.mongodb.net/${database}?retryWrites=true&w=majority`;

    /**
     * Creates a new instance of the MongoClient with specified options.
     */
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    /**
     * Establishes a connection to the MongoDB database.
     */
    this.client
      .connect()
      .then(() => {
        this.isConnected = true;
        this.usersCollection = this.client.db().collection('users');
        this.chatsCollection = this.client.db().collection('chats');
      })
      .catch((error) => {
        this.isConnected = false;
        console.log(error);
      });
  }

  /**
   * Checks if the database connection is alive.
   *
   * @returns {boolean} - The status of the database connection.
   */
  isAlive() {
    return this.isConnected;
  }

  /**
   * Retrieves the number of users in the users collection.
   *
   * @returns {Promise<number>} - The number of users.
   */
  async nbUsers() {
    const userNb = await this.usersCollection.countDocuments();
    return userNb;
  }

  /**
   * Retrieves a user from the users collection based on the provided email.
   *
   * @param {Object} email - The email object.
   * @returns {Promise<Object | null>} - The user object or null if not found.
   */
  async fetchUserByEmail(email) {
    const response = await this.usersCollection.findOne(email);
    return response;
  }

  /**
   * Creates a new user in the users collection.
   *
   * @param {Object} user - The user object.
   * @returns {Promise<string>} - The ID of the inserted user.
   */
  async createUser(user) {
    const response = await this.usersCollection.insertOne(user);
    return response.insertedId.toString();
  }

  /**
   * Retrieves a user from the users collection based on the provided user ID.
   *
   * @param {string} userID - The user ID.
   * @returns {Promise<Object | null>} - The user object or null if not found.
   */
  async fetchUserByID(userID) {
    const user = await this.usersCollection.findOne({ _id: new ObjectId(userID) });
    return user;
  }

  /**
   * Creates a new chat history in the chats collection.
   *
   * @param {Object} chat - The chat object.
   * @returns {Promise<string>} - The ID of the inserted chat history.
   */
  async createChatHistory(chat) {
    const response = await this.chatsCollection.insertOne(chat);
    return response.insertedId.toString();
  }

  /**
   * Retrieves chat history for a user from the chats collection.
   *
   * @param {string} userID - The user ID.
   * @returns {Promise<Object | null>} - The chat history object or null if not found.
   */
  async fetchUserChat(userID) {
    const chats = await this.chatsCollection.findOne({ userID: new ObjectId(userID) });
    return chats;
  }

  /**
   * Updates the chat history in the chats collection.
   *
   * @param {string} chatID - The ID of the chat history.
   * @param {Array} updatedHistory - The updated chat history.
   * @returns {Promise<void>} - A Promise that resolves when the operation is complete.
   */
  async updateChatHistory(chatID, updatedHistory) {
    console.log(chatID);
    try {
      await this.chatsCollection.updateOne(
        { _id: chatID },
        { $set: { history: updatedHistory } }
      );
    } catch (error) {
      console.error("Error saving chat history:", error);
      throw error;
    }
  }
}

/**
 * Creates a singleton instance of the DBClient.
 */
const dbClient = new DBClient();

export default dbClient;
