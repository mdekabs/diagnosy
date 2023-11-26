import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { config } from "dotenv";

config();


class DBClient {
  constructor() {
    const database = process.env.DB;
    this.isConnected = false;
    this.usersCollection = null;
    this.chatsCollection = null
    const password = process.env.DB_PASSWORD;
    const uri = `mongodb+srv://MikeRock:${password}@cluster0.qyotcp1.mongodb.net/${database}?retryWrites=true&w=majority`;
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

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

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    const userNb = await this.usersCollection.countDocuments();
    return userNb;
  }

  async fetchUserByEmail(email) {
    const response = await this.usersCollection.findOne(email);
    return response;
  }

  async createUser(user) {
    const response = await this.usersCollection.insertOne(user);
    return response.insertedId.toString();
  }

  async fetchUserByID(userID) {
    const user = await this.usersCollection.findOne({ _id: new ObjectId(userID) });
    return user;
  }

  async createChatHistory(chat) {
    const response = await this.chatsCollection.insertOne(chat);
    return response.insertedId.toString();
  }

  async fetchUserChat(userID) {
    const chats = await this.chatsCollection.findOne({ userID: new ObjectId(userID) });
    return chats;
  }

	async saveChatHistory(userID, chatHistory) {
		try {
			await this.usersCollection.updateOne(
				{ _id: new ObjectId(userID) },
				{ $push: { chatHistory } }
			);
		}
		catch (error) {
			console.error("Error saving chat history:", error);
			throw error;
		}
	}

}

const dbClient = new DBClient();

export default dbClient;
