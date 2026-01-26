import { io } from "socket.io-client";

const SOCKET_URL = "http://10.119.77.98:8000"; // your backend URL

export const socket = io(SOCKET_URL, {
    autoConnect: false,   // important for control
    transports: ["websocket"]
});
