import Message from "../models/message.model.js";
import { io } from "../server.js";

// send message controller
export const sendMessageToUser = async (req, res) => {
    try {
        const { receiverPhoneNumber, message } = req.body;
        const senderPhoneNumber = req.user?.phoneNumber;

        if (!senderPhoneNumber) {
            return res.status(401).json({ success: false, error: "Unauthorized: sender not found." });
        }

        if (!receiverPhoneNumber || !message) {
            return res.status(400).json({ success: false, error: "receiverPhoneNumber and message are required." });
        }

        // Save message to MongoDB
        const newMessage = await Message.create({
            sender: senderPhoneNumber,
            receiver: receiverPhoneNumber,
            content: message,
            timestamp: new Date()
        });

        // Emit to specific receiver (if they are connected)
        // Assuming each user joins a room named after their phone number
        io.to(receiverPhoneNumber).emit("newMessage", newMessage);

        return res.status(200).json({
            success: true,
            message: `Message sent from ${senderPhoneNumber} to ${receiverPhoneNumber}`,
            data: newMessage
        });

    } catch (error) {
        console.error("Error sending message:", error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};


// get message controller

export const getMessagesBetweenUsers = async (req, res) => {
    try {
        const { otherUserPhoneNumber } = req.params;
        const userPhoneNumber = req.user?.phoneNumber;

        // Validate user authentication
        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found."
            });
        }

        // Validate input
        if (!otherUserPhoneNumber) {
            return res.status(400).json({
                success: false,
                error: "otherUserPhoneNumber is required."
            });
        }

        // Fetch all messages between the two users (both directions)
        const messages = await Message.find({
            $or: [
                { sender: userPhoneNumber, receiver: otherUserPhoneNumber },
                { sender: otherUserPhoneNumber, receiver: userPhoneNumber }
            ]
        })
            .sort({ timestamp: 1 }) // oldest first
            .lean(); // optimize query performance (returns plain JS objects)

        return res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};
