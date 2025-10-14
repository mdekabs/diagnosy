import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  history: {
    type: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    default: [],
  },
}, { timestamps: true });

chatSchema.index({ userID: 1 }, { unique: true });

const Chat = mongoose.model('Chat', chatSchema);
export { Chat };
