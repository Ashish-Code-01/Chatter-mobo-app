import { io } from "socket.io-client";

const SOCKET_URL = "https://chatter-mobo-app.onrender.com"; // your backend URL

export const socket = io(SOCKET_URL, {
    autoConnect: false,   // important for control
    transports: ["websocket"]
});

// Helper functions for device registration and message sync
export const registerDevice = (phoneNumber, deviceId) => {
    if (!socket.connected) {
        console.warn('Socket not connected, waiting...');
        socket.once('connect', () => {
            socket.emit('registerDevice', { phoneNumber, deviceId });
        });
        return;
    }
    console.log(`📱 Registering device ${deviceId} for user ${phoneNumber}`);
    socket.emit('registerDevice', { phoneNumber, deviceId });
};

export const requestMessageSync = (phoneNumber, deviceId) => {
    if (!socket.connected) {
        console.warn('Socket not connected, waiting...');
        socket.once('connect', () => {
            socket.emit('requestMessageSync', { phoneNumber, deviceId });
        });
        return;
    }
    console.log(`🔄 Requesting message sync for device ${deviceId}`);
    socket.emit('requestMessageSync', { phoneNumber, deviceId });
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
