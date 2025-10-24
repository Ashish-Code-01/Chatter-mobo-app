import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: Number,
        required: true,
        unique: true,
        minlength: 10,
        maxlength: 10,
    },
    name: {
        default: "User",
        type: String,
    },
    bio: {
        type: String,
        default: "Hey there! I am using Chatter."
    },
    otp: {
        type: Number,
    },
    isverified: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
        default: ""
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;  