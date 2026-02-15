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

// Generate or retrieve deviceId with improved uniqueness
export const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        // Generate more unique ID using multiple entropy sources
        const timestamp = Date.now().toString(36);
        const randomComponent = Math.random().toString(36).substr(2, 12);
        const userAgent = navigator.userAgent.substring(0, 8).replace(/[^a-z0-9]/gi, '');
        deviceId = `web-${userAgent}-${timestamp}-${randomComponent}`;
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
};
