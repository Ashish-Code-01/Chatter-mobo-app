import { io } from "socket.io-client";

const SOCKET_URL = "https://chatter-mobo-app.onrender.com"; // your backend URL

export const socket = io(SOCKET_URL, {
    autoConnect: true,   // auto connect on initialization
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
});

// Ensure socket is connected
export const ensureSocketConnected = (callback) => {
    if (socket.connected) {
        callback();
    } else {
        socket.once('connect', callback);
    }
};

// Helper functions for device registration and message sync
export const registerDevice = (phoneNumber, deviceId) => {
    ensureSocketConnected(() => {
        console.log(`📱 Registering device ${deviceId} for user ${phoneNumber}`);
        socket.emit('registerDevice', { phoneNumber, deviceId });
    });
};

export const requestMessageSync = (phoneNumber, deviceId) => {
    ensureSocketConnected(() => {
        console.log(`🔄 Requesting message sync for device ${deviceId}`);
        socket.emit('requestMessageSync', { phoneNumber, deviceId });
    });
};

// Generate or retrieve deviceId
export const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
};
