import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: Number,
        ref: "User",
        required: true,
    },
    receiver: {
        type: Number,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    seen: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;  