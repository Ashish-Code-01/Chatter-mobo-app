import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import morgan from "morgan";
import connectDB from "./lib/dbconnect.js";
import userRoute from "./routes/user.route.js";
import contactRoute from "./routes/contact.route.js";
import messageRoute from "./routes/message.route.js";
import deviceRoute from "./routes/device.route.js";
import Message from "./models/message.model.js";
import User from "./models/user.model.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";


const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// set up socket.io
export const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// handle socket connection for messaging and online status
const connectedUsers = new Map(); // phoneNumber -> socket.id
const linkdevices = new Map();
// Device tracking for chat sync
const deviceSocketMap = new Map(); // deviceId -> socket.id
const userDevicesMap = new Map(); // phoneNumber -> Set of deviceIds
const socketDeviceMap = new Map(); // socket.id -> deviceId (reverse lookup)

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Register user by phone number
    socket.on("register", async (phoneNumber) => {
        if (!phoneNumber) return;
        connectedUsers.set(phoneNumber, socket.id);
        console.log(`User ${phoneNumber} connected`);

        // Update user status to online in database
        try {
            await User.findOneAndUpdate(
                { phoneNumber },
                { isOnline: true, lastSeen: new Date() },
                { new: true }
            );
        } catch (error) {
            console.error("Error updating online status:", error);
        }

        // Broadcast to all clients that a user came online
        io.emit("userStatusChanged", { phoneNumber, isOnline: true });
    });

    // Register device for chat sync
    socket.on("registerDevice", async ({ phoneNumber, deviceId }) => {
        if (!phoneNumber || !deviceId) {
            console.log("Invalid registerDevice payload");
            return;
        }

        // Store device socket mapping
        deviceSocketMap.set(deviceId, socket.id);
        socketDeviceMap.set(socket.id, deviceId);

        // Store user-device mapping
        if (!userDevicesMap.has(phoneNumber)) {
            userDevicesMap.set(phoneNumber, new Set());
        }
        userDevicesMap.get(phoneNumber).add(deviceId);

        console.log(`Device ${deviceId} registered for user ${phoneNumber}`);
    });

    // Send message to another user
    socket.on("sendMessage", async ({ from, to, message, publickey, files, deviceId }) => {
        console.log(`Message from ${from} to ${to} - Encrypted: ${message.substring(0, 20)}... || File: ${files ? 'Yes' : 'No'}`);

        // Validate message is not empty
        if (!from || !to) {
            console.error("Invalid message data");
            return;
        }

        const receiverSocketId = connectedUsers.get(to);
        let savedMessage = null;

        // Save message to database
        try {
            savedMessage = await Message.create({
                sender: from,
                receiver: to,
                content: message,  // Store encrypted content
                file: files || null,
                Publickey: publickey || "",  // Store public key for decryption
                deviceId: deviceId || null,
                timestamp: new Date()
            });
        } catch (err) {
            console.error("Error saving message to database:", err);
        }

        if (receiverSocketId) {
            // Receiver is online - send encrypted message directly
            io.to(receiverSocketId).emit("Receivemessage", {
                from,
                message,
                files: files || null,
                publickey: publickey || ""
            });
            console.log(`Message delivered to online receiver: ${to}`);
        }

        // Sync message to all linked devices of the sender (except the originating device)
        if (deviceId && userDevicesMap.has(from)) {
            const senderDevices = userDevicesMap.get(from);
            senderDevices.forEach(devId => {
                if (devId !== deviceId) {
                    const deviceSocketId = deviceSocketMap.get(devId);
                    if (deviceSocketId) {
                        io.to(deviceSocketId).emit("messageSynced", {
                            from,
                            to,
                            message,
                            files: files || null,
                            publickey: publickey || "",
                            timestamp: savedMessage?.createdAt || new Date(),
                            messageId: savedMessage?._id
                        });
                    }
                }
            });
        }

        // Sync message to all linked devices of the receiver (except if receiver is online on same device)
        if (userDevicesMap.has(to)) {
            const receiverDevices = userDevicesMap.get(to);
            receiverDevices.forEach(devId => {
                const deviceSocketId = deviceSocketMap.get(devId);
                if (deviceSocketId && deviceSocketId !== receiverSocketId) {
                    io.to(deviceSocketId).emit("messageSynced", {
                        from,
                        to,
                        message,
                        files: files || null,
                        publickey: publickey || "",
                        timestamp: savedMessage?.createdAt || new Date(),
                        messageId: savedMessage?._id
                    });
                }
            });
        }
    });

    // Listen for device linking request
    socket.on("LinkDevice", async ({ socketId, token, serverkey, privatekey, Users, deviceId }) => {
        if (!socketId || !token) {
            console.log("Invalid LinkDevice payload");
            return;
        }

        // Check if target socket exists
        const targetSocket = io.sockets.sockets.get(socketId);
        if (!targetSocket) {
            console.log("Target socket not found:", socketId);
            return;
        }

        // Store the linked device
        linkdevices.set(socket.id, token);

        // Decode token to get user info
        let userPhoneNumber = null;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user) {
                userPhoneNumber = user.phoneNumber;
                
                // Register device if deviceId is provided
                if (deviceId) {
                    deviceSocketMap.set(deviceId, socket.id);
                    socketDeviceMap.set(socket.id, deviceId);
                    
                    if (!userDevicesMap.has(userPhoneNumber)) {
                        userDevicesMap.set(userPhoneNumber, new Set());
                    }
                    userDevicesMap.get(userPhoneNumber).add(deviceId);
                    
                    console.log(`Device ${deviceId} registered for user ${userPhoneNumber} during linking`);
                }
            }
        } catch (error) {
            console.error("Error decoding token during device linking:", error);
        }

        // Notify target device
        io.to(socketId).emit("DeviceLinked", {
            token,
            linkedSocketId: socket.id,
            serverkey,
            privatekey,
            Users,
            phoneNumber: userPhoneNumber
        });

        console.log(`Device ${socket.id} linked to ${socketId}`);
    });

    // Request message sync for a device
    socket.on("requestMessageSync", async ({ phoneNumber, deviceId }) => {
        if (!phoneNumber || !deviceId) {
            console.log("Invalid requestMessageSync payload");
            return;
        }

        try {
            // Fetch all messages where user is sender or receiver
            const messages = await Message.find({
                $or: [
                    { sender: phoneNumber },
                    { receiver: phoneNumber }
                ]
            })
                .sort({ createdAt: 1 })
                .lean();

            console.log(`Syncing ${messages.length} messages to device ${deviceId} for user ${phoneNumber}`);

            // Send messages in batches to avoid overwhelming the client
            const batchSize = 50;
            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                socket.emit("bulkMessageSync", {
                    messages: batch,
                    batchIndex: Math.floor(i / batchSize),
                    totalBatches: Math.ceil(messages.length / batchSize),
                    isLastBatch: i + batchSize >= messages.length
                });
            }

            // Update syncedDevices for all messages
            const messageIds = messages.map(m => m._id);
            await Message.updateMany(
                { _id: { $in: messageIds } },
                { $addToSet: { syncedDevices: deviceId } }
            );
        } catch (error) {
            console.error("Error syncing messages:", error);
            socket.emit("syncError", { message: "Failed to sync messages" });
        }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
        linkdevices.delete(socket.id);
        
        // Clean up device tracking
        const deviceId = socketDeviceMap.get(socket.id);
        if (deviceId) {
            deviceSocketMap.delete(deviceId);
            socketDeviceMap.delete(socket.id);
            
            // Remove device from user's device list
            for (let [phoneNumber, deviceSet] of userDevicesMap.entries()) {
                if (deviceSet.has(deviceId)) {
                    deviceSet.delete(deviceId);
                    if (deviceSet.size === 0) {
                        userDevicesMap.delete(phoneNumber);
                    }
                    break;
                }
            }
        }

        const phoneNumber = getPhoneBySocket(socket.id);
        if (phoneNumber) {
            connectedUsers.delete(phoneNumber);
            console.log(`User ${phoneNumber} disconnected`);

            // Update user status to offline in database
            try {
                await User.findOneAndUpdate(
                    { phoneNumber },
                    { isOnline: false, lastSeen: new Date() },
                    { new: true }
                );
            } catch (error) {
                console.error("Error updating offline status:", error);
            }

            // Broadcast to all clients that a user went offline
            io.emit("userStatusChanged", { phoneNumber, isOnline: false });
        } else {
            console.log("Client disconnected:", socket.id);
        }
    });
});

// Helper function
function getPhoneBySocket(socketId) {
    for (let [phone, id] of connectedUsers.entries()) {
        if (id === socketId) return phone;
    }
    return null;
}

// Socket io setup for the link Device feature can be added here

app.use(morgan('dev')); //for development mode only


app.use(cors());
app.use(express.json({ limit: "10240mb" }));

// Connect to Database
connectDB();

app.get("/", (req, res) => {
    // res.send("API is running...");
    res.send(connectedUsers)
});
app.get("/status", (req, res) => {
    res.send({ status: "OK", timestamp: new Date() });
});
app.use("/auth", userRoute);
app.use("/api/contact", contactRoute);
app.use("/api/messages", messageRoute);
app.use("/api/devices", deviceRoute);

// Get all online users
app.get("/api/online/users", (req, res) => {
    const onlineUsers = Array.from(connectedUsers.keys());
    res.status(200).json({ success: true, onlineUsers: onlineUsers });
});

// Get online status of a specific user
app.get("/api/online/status/:phoneNumber", async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const user = await User.findOne({ phoneNumber }).select('phoneNumber isOnline lastSeen');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                phoneNumber: user.phoneNumber,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


export default server;