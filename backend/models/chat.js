import mongoose from 'mongoose';
import { encryptText, decryptText } from '../utils/encryption.js';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: {
    type: String,
    required: true,
    set: (value) => (value ? encryptText(value) : value),
    get: (value) => (value ? decryptText(value) : value),
  },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ timestamp: -1 });

const chatSchema = new mongoose.Schema(
  {
    userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    history: { type: [messageSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

chatSchema.index({ userID: 1 }, { unique: true });

/* -------------------- METHODS -------------------- */

chatSchema.methods.addMessage = async function (role, content) {
  const encryptedContent = encryptText(content);
  this.history.push({ role, content: encryptedContent, timestamp: new Date() });
  await this.save();
  return this;
};

chatSchema.methods.getDecryptedHistory = function () {
  return this.history.map((msg) => ({
    role: msg.role,
    content: decryptText(msg.content),
    timestamp: msg.timestamp,
  }));
};

chatSchema.statics.findOrCreate = async function (userID) {
  let chat = await this.findOne({ userID });
  if (!chat) {
    chat = await this.create({ userID, history: [] });
  }
  return chat;
};

/* -------------------- EXPORT -------------------- */

const Chat = mongoose.model('Chat', chatSchema);
export { Chat };

