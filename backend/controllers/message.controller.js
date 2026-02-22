import Message from "../models/message.model.js";

// Helper: parse chatId (format "chat_phone1_phone2") to [phone1, phone2]
const parseChatId = (chatIdParam) => {
    if (!chatIdParam || typeof chatIdParam !== "string") return null;
    try {
        const chatId = decodeURIComponent(chatIdParam);
        if (!chatId.startsWith("chat_")) return null;
        const parts = chatId.split("_").slice(1);
        if (parts.length < 2) return null;
        return parts;
    } catch {
        return null;
    }
};

// Get messages by chatId (for web app retrieval by chat)
export const getMessagesByChatId = async (req, res) => {
    try {
        const userPhoneNumber = req.user?.phoneNumber;
        const { chatId } = req.params;

        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found."
            });
        }

        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: "chatId is required (format: chat_phone1_phone2)."
            });
        }

        const phones = parseChatId(chatId);
        if (!phones || phones.length < 2) {
            return res.status(400).json({
                success: false,
                error: "Invalid chatId format. Use chat_phone1_phone2."
            });
        }

        const [p1, p2] = phones;
        if (userPhoneNumber !== p1 && userPhoneNumber !== p2) {
            return res.status(403).json({
                success: false,
                error: "You can only access messages for chats you are part of."
            });
        }

        const messages = await Message.find({
            $or: [
                { sender: p1, receiver: p2 },
                { sender: p2, receiver: p1 }
            ]
        })
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: messages.length,
            data: messages,
            chatId
        });
    } catch (error) {
        console.error("Error fetching messages by chatId:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
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

// controller for getting the all unseen messages of the user is logedin

export const getMessagesForMe = async (req, res) => {
    try {
        const userPhoneNumber = req.user?.phoneNumber;
        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found."
            });
        }

        const messages = await Message.find({ receiver: userPhoneNumber, seen: false });

        return res.status(200).json({
            success: true,
            data: messages,
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({
            success: false,
            error: "Server error while fetching messages."
        });
    }
};

// controller for seen Messages

export const seenmsg = async (req, res) => {
    try {
        const userPhoneNumber = req.user?.phoneNumber;
        const { receiverPhoneNumber } = req.body;

        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found.",
            });
        }

        if (!receiverPhoneNumber) {
            return res.status(400).json({
                success: false,
                error: "receiverPhoneNumber is required.",
            });
        }

        // Update all unseen messages where the logged-in user is the receiver
        const result = await Message.updateMany(
            {
                sender: receiverPhoneNumber,
                receiver: userPhoneNumber,
                seen: false,
            },
            {
                $set: { seen: true, seenAt: new Date() },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Messages marked as seen.",
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Error marking messages as seen:", error);
        return res.status(500).json({
            success: false,
            error: "Server error while marking messages as seen.",
        });
    }
};

// Sync messages for a device
export const syncMessagesForDevice = async (req, res) => {
    try {
        const userPhoneNumber = req.user?.phoneNumber;
        const { deviceId } = req.body;

        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found."
            });
        }

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: "deviceId is required."
            });
        }

        // Fetch all messages where user is sender or receiver
        const messages = await Message.find({
            $or: [
                { sender: userPhoneNumber },
                { receiver: userPhoneNumber }
            ]
        })
            .sort({ createdAt: 1 })
            .lean();

        // Update syncedDevices for all messages
        const messageIds = messages.map(m => m._id);
        await Message.updateMany(
            { _id: { $in: messageIds } },
            { $addToSet: { syncedDevices: deviceId } }
        );

        return res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        console.error("Error syncing messages:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};

// Update message status (delivered/seen)
export const updateMessageStatus = async (req, res) => {
    try {
        const userPhoneNumber = req.user?.phoneNumber;
        const { messageId, status } = req.body;

        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found."
            });
        }

        if (!messageId || !status) {
            return res.status(400).json({
                success: false,
                error: "messageId and status are required."
            });
        }

        if (!['sent', 'delivered', 'seen'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid status. Must be 'sent', 'delivered', or 'seen'."
            });
        }

        const updateData = { status };
        if (status === 'seen') {
            updateData.seen = true;
        }

        const message = await Message.findByIdAndUpdate(
            messageId,
            updateData,
            { new: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                error: "Message not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: `Message status updated to '${status}'`,
            data: message
        });
    } catch (error) {
        console.error("Error updating message status:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};

// Mark all messages from a user as delivered
export const markMessagesDelivered = async (req, res) => {
    try {
        const userPhoneNumber = req.user?.phoneNumber;
        const { otherUserPhoneNumber } = req.body;

        if (!userPhoneNumber) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized: user not found."
            });
        }

        if (!otherUserPhoneNumber) {
            return res.status(400).json({
                success: false,
                error: "otherUserPhoneNumber is required."
            });
        }

        const result = await Message.updateMany(
            {
                sender: otherUserPhoneNumber,
                receiver: userPhoneNumber,
                status: { $in: ['sent', 'delivered'] }
            },
            { status: "delivered" }
        );

        return res.status(200).json({
            success: true,
            message: `Marked ${result.modifiedCount} messages as delivered`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error marking messages as delivered:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};
