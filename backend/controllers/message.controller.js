import Message from "../models/message.model.js";

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
