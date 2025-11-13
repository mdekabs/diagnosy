import mongoose from 'mongoose';
import { encryptText, decryptText } from '../utils/encryption.js';

/* -------------------- MESSAGE SCHEMA -------------------- */

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'], // only allow valid roles
    required: [true, 'Message role is required.'],
  },
  content: {
    type: String,
    required: [true, 'Message content is required.'],
    minlength: [1, 'Message cannot be empty.'],
    maxlength: [2000, 'Message is too long.'],
    // Encrypt before saving, decrypt when reading
    set: (value) => (value ? encryptText(value.trim()) : value),
    get: (value) => (value ? decryptText(value) : value),
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

// Index to optimize sorting by newest messages
messageSchema.index({ timestamp: -1 });

/* -------------------- CHAT SCHEMA -------------------- */

const chatSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      validate: {
        validator: mongoose.isValidObjectId,
        message: 'Invalid user ID format.',
      },
    },
    history: {
      type: [messageSchema],
      default: [],
      validate: {
        validator: function (messages) {
          return messages.length <= 10000;
        },
        message: 'Message history limit exceeded (max 10,000).',
      },
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    toJSON: { getters: true }, // ensures decrypted values show in JSON output
    toObject: { getters: true },
  }
);

// Each user has one chat record
chatSchema.index({ userID: 1 }, { unique: true });

/* -------------------- METHODS -------------------- */

// Add a new message to chat
chatSchema.methods.addMessage = async function (role, content) {
  // Validate message manually before pushing
  if (!role || !['user', 'assistant'].includes(role)) {
    throw new Error('Invalid role.');
  }
  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  const encryptedContent = encryptText(content.trim());
  this.history.push({ role, content: encryptedContent, timestamp: new Date() });

  await this.save();
  return this;
};

// Decrypt all messages for reading
chatSchema.methods.getDecryptedHistory = function () {
  return this.history.map((msg) => ({
    role: msg.role,
    content: decryptText(msg.content),
    timestamp: msg.timestamp,
  }));
};

// Find or create chat record
chatSchema.statics.findOrCreate = async function (userID) {
  if (!mongoose.isValidObjectId(userID)) {
    throw new Error('Invalid user ID format.');
  }

  let chat = await this.findOne({ userID });
  if (!chat) {
    chat = await this.create({ userID, history: [] });
  }
  return chat;
};

/* -------------------- EXPORT -------------------- */

const Chat = mongoose.model('Chat', chatSchema);
export { Chat };
