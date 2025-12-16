import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        minlength: 10,
        maxlength: 13,
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
    otpExpiry: {
        type: Date,
        required: true,
    },
    isverified: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
        default: ""
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: new Date()
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;  