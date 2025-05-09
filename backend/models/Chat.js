import mongoose from "mongoose";
import User from "./user.js";

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [String]
});

const ChatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  messages: [MessageSchema],
  relatedSOS: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SOS"
  },
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

const Chat = mongoose.model("Chat", ChatSchema);
export default Chat;