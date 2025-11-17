import mongoose from 'mongoose';
import { encryptText, decryptText } from '../utils/encryption.js';
import { logger } from '../config/index.js';

/* -------------------- MESSAGE SCHEMA -------------------- */

// Encrypts content on write
const encryptSetter = (value) => {
  if (typeof value === 'string' && value.length > 0) {
    return encryptText(value.trim());
  }
  return value;
};

// Decrypts content on read
const decryptGetter = (value) => {
  if (typeof value === 'string' && value.length > 0) {
    try {
      return decryptText(value);
    } catch (err) {
      logger.error(`Decryption error: ${err.message}`);
      return '[Decryption Failed]';
    }
  }
  return value;
};

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    set: encryptSetter,
    get: decryptGetter,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    validate: {
      validator: (value) => !isNaN(value.getTime()),
      message: 'Invalid timestamp value.',
    },
  },
});

messageSchema.index({ timestamp: -1 });

/* -------------------- CHAT SCHEMA -------------------- */

const chatSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    history: {
      type: [messageSchema],
      default: [],
      validate: {
        validator: (messages) => messages.length <= 10000,
        message: 'Message history limit exceeded (max 10,000).',
      },
    },

    disclaimerAdded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

chatSchema.index({ userID: 1 }, { unique: true });

/* -------------------- METHODS -------------------- */

// Adds a message; encryption is handled by the schema setter
chatSchema.methods.addMessage = async function (role, content) {
  if (!['user', 'assistant'].includes(role)) {
    throw new Error('Invalid role.');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  this.history.push({
    role,
    content: content.trim(),
    timestamp: new Date(),
  });

  await this.save();
  return this;
};

// Returns all messages with decrypted content via getters
chatSchema.methods.getDecryptedHistory = function () {
  return this.history.map((msg) => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    _id: msg._id,
  }));
};

// Finds an existing chat or creates a new one
chatSchema.statics.findOrCreate = async function (userID) {
  let chat = await this.findOne({ userID });
  if (!chat) chat = await this.create({ userID });
  return chat;
};

/* -------------------- EXPORT -------------------- */

const Chat = mongoose.model('Chat', chatSchema);
export { Chat };
