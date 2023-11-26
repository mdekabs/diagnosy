import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
// import { MongoClient, ObjectId } from 'mongodb';
import { config } from "dotenv";

config();


class DBClient {
  constructor() {
    // const host = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
    // const port = process.env.DB_PORT ? process.env.DB_PORT : 27017;
    const database = process.env.DB;
    this.isConnected = false;
    this.usersCollection = null;
    this.chatCollection = null
    // this.client = new MongoClient(`mongodb://${host}:${port}/${database}`);
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

  async createChat(chat) {
    const chatHistory = [];
		// const systemMessage = "Your name is Daisy. You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that";
		// chatHistory.push(["system", systemMessage]);
		// const chat = {chatHistory, userID}
    const response = await this.chatsCollection.insertOne(chat);
    return response.insertedId.toString();
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
