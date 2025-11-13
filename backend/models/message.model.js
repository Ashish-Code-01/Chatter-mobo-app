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
    content: {
        type: String,
        required: true,
    },
    Publickey: {
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