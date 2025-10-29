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

io.on("connection", (socket) => {


    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
})

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