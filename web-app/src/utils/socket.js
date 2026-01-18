import { io } from "socket.io-client";

const SOCKET_URL = "http://10.115.97.98:8000"; // your backend URL

export const socket = io(SOCKET_URL, {
    autoConnect: false,   // important for control
    transports: ["websocket"]
});
