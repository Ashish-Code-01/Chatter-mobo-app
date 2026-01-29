import { io } from "socket.io-client";

const SOCKET_URL = "https://chatter-mobo-app.onrender.com"; // your backend URL

export const socket = io(SOCKET_URL, {
    autoConnect: false,   // important for control
    transports: ["websocket"]
});
