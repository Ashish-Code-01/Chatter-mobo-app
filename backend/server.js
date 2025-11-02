import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import connectDB from "./lib/dbconnect.js";
import userRoute from "./routes/user.route.js";
import contactRoute from "./routes/contact.route.js";
import messageRoute from "./routes/message.route.js";
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

// handle socket connection

const connectedUsers = new Map(); // phoneNumber -> socket.id

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Register user by phone number
    socket.on("register", (phoneNumber) => {
        if (!phoneNumber) return;
        connectedUsers.set(phoneNumber, socket.id);
        console.log(`User ${phoneNumber} connected`);
    });

    // Send message to another user
    socket.on("sendMessage", ({ from, to, message }) => {
        const receiverSocketId = connectedUsers.get(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", { from, message });
        } else {
            console.log(`User ${to} is offline`);
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        const phoneNumber = getPhoneBySocket(socket.id);
        if (phoneNumber) {
            connectedUsers.delete(phoneNumber);
            console.log(`User ${phoneNumber} disconnected`);
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

app.use(cors());
app.use(express.json({ limit: "40mb" }));

// Connect to Database
connectDB();

app.get("/", (req, res) => {
    res.send("API is running...");
});
app.get("/status", (req, res) => {
    res.send({ status: "OK", timestamp: new Date() });
});
app.use("/auth", userRoute);
app.use("/api/contact", contactRoute);
app.use("/api/messages", messageRoute);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default server;