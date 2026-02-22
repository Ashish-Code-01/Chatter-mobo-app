import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        ref: "User",
        required: true,
    },
    receiver: {
        type: String,
        ref: "User",
        required: true,
    },
    chatId: {
        type: String,
        required: false,
    },
    content: {
        type: String,
    },
    Publickey: {
        type: String,
    },
    file: {
        type: [],
        default: null,
    },
    seen: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent',
    },
    deviceId: {
        type: String,
        default: null,
    },
    syncedDevices: {
        type: [String],
        default: [],
    }
}, { timestamps: true });

// Create database indexes for frequently queried fields
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, seen: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;  