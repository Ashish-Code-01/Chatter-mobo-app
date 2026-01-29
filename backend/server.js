import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import morgan from "morgan"; // for development mode only
import connectDB from "./lib/dbconnect.js";
import userRoute from "./routes/user.route.js";
import contactRoute from "./routes/contact.route.js";
import messageRoute from "./routes/message.route.js";
import deviceRoute from "./routes/device.route.js";
import Message from "./models/message.model.js";
import User from "./models/user.model.js";
import { Server } from "socket.io";


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
const linkdevices = new Map()

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

    // Send message to another user
    socket.on("sendMessage", ({ from, to, message, publickey, files }) => {
        console.log(`Message from ${from} to ${to} - Encrypted: ${message.substring(0, 20)}... || File: ${files ? 'Yes' : 'No'}`);

        // Validate message is not empty
        if (!from || !to) {
            console.error("Invalid message data");
            return;
        }

        const receiverSocketId = connectedUsers.get(to);
        if (receiverSocketId) {
            // Receiver is online - send encrypted message directly
            io.to(receiverSocketId).emit("Receivemessage", {
                from,
                message,
                files: files || null,
                publickey: publickey || ""
            });
            console.log(`Message delivered to online receiver: ${to}`);
        } else {
            // Receiver is offline - save to database encrypted
            console.log(`Receiver ${to} offline, saving encrypted message to database`);
            Message.create({
                sender: from,
                receiver: to,
                content: message,  // Store encrypted content
                file: files || null,
                Publickey: publickey || "",  // Store public key for decryption
                timestamp: new Date()
            }).catch(err => {
                console.error("Error saving message to database:", err);
            });
        }
    });

    // Listen for device linking request
    socket.on("LinkDevice", ({ socketId, token }) => {
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

        // Notify target device
        io.to(socketId).emit("DeviceLinked", {
            token,
            linkedSocketId: socket.id
        });

        console.log(`Device ${socket.id} linked to ${socketId}`);
    });

    // Cleanup on disconnect
    socket.on("disconnect", () => {
        linkdevices.delete(socket.id);
        console.log("Client disconnected:", socket.id);
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
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

// app.use(morgan('dev')); //for development mode only


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