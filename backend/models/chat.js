/**
 * Chat & Message Models (with Field-Level Encryption)
 * ---------------------------------------------------
 * This module defines two Mongoose schemas:
 * 1. Message — Stores individual chat messages (de-normalized collection)
 * 2. Chat — Stores chat metadata and helper methods
 *
 * Includes:
 * - Transparent encryption on write (setter)
 * - Transparent decryption on read (getter)
 * - Pagination-friendly message structure
 */

import mongoose from 'mongoose';
import { encryptText, decryptText } from '../utils/encryption.js';
import { logger } from '../config/index.js';

/* -------------------------------------------------------------------------- */
/*                          ENCRYPTION HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Setter: Encrypts message content before storing in the database.
 * Runs automatically when a message is created or updated.
 */
const encryptSetter = (value) => {
  if (typeof value === 'string' && value.length > 0) {
    return encryptText(value.trim());
  }
  return value;
};

/**
 * Getter: Decrypts message content when retrieved from MongoDB.
 * Ensures all returned messages include human-readable text.
 */
const decryptGetter = (value) => {
  if (typeof value === 'string' && value.length > 0) {
    try {
      return decryptText(value);
    } catch (err) {
      logger.error(`Failed to decrypt message: ${err.message}`);
      return '[Decryption Failed]';
    }
  }
  return value;
};

/* -------------------------------------------------------------------------- */
/*                               MESSAGE SCHEMA                               */
/* -------------------------------------------------------------------------- */
/**
 * Each message is an independent document (de-normalized design).
 * This avoids large nested arrays and improves query performance.
 */

const messageSchema = new mongoose.Schema(
  {
    /** Links message → parent Chat document */
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },

    /** Role of the entity sending the message */
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },

    /** Strong-encrypted chat message content */
    content: {
      type: String,
      required: true,
      set: encryptSetter,
      get: decryptGetter,
    },

    /** Timestamp of when the message was added */
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Ensures getters (decryption) are applied on toJSON and toObject
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Optimized index: speeds up message retrieval per chat in descending order
messageSchema.index({ chatId: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

/* -------------------------------------------------------------------------- */
/*                                 CHAT SCHEMA                                */
/* -------------------------------------------------------------------------- */
/**
 * Lightweight Chat schema that stores only metadata.
 * The actual messages live in the Message collection.
 */

const chatSchema = new mongoose.Schema(
  {
    /** Associated user */
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Tracks if any system disclaimer has been injected */
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

// Ensure each user has exactly one chat entry
chatSchema.index({ userID: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/*                               CHAT METHODS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Add a new message to this chat.
 *
 * @param {string} role - "user" or "assistant"
 * @param {string} content - The plaintext message content
 * @returns {Promise<Document>} The newly created Message doc
 */
chatSchema.methods.addMessage = async function (role, content) {
  if (!['user', 'assistant'].includes(role)) {
    throw new Error('Invalid message role.');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  return await Message.create({
    chatId: this._id,
    role,
    content: content.trim(), // Encryption via schema setter
    timestamp: new Date(),
  });
};

/**
 * Retrieve paginated chat history.
 * Automatically returns decrypted message content.
 *
 * @param {number} limit - Max number of messages
 * @param {number} skip - Number of messages to skip (pagination offset)
 * @returns {Promise<Array<Document>>}
 */
chatSchema.methods.getHistory = async function (limit = 50, skip = 0) {
  return await Message.find({ chatId: this._id })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean({ getters: true }); // Ensures decrypted output
};

/* -------------------------------------------------------------------------- */
/*                               CHAT STATICS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Finds an existing chat or creates a new one for the user.
 *
 * @param {ObjectId} userID
 * @returns {Promise<Document>} Chat instance
 */
chatSchema.statics.findOrCreate = async function (userID) {
  let chat = await this.findOne({ userID });
  if (!chat) {
    chat = await this.create({ userID });
  }
  return chat;
};

/* -------------------------------------------------------------------------- */
/*                                  EXPORTS                                   */
/* -------------------------------------------------------------------------- */

const Chat = mongoose.model('Chat', chatSchema);

export { Chat, Message };

