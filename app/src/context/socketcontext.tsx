import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = "https://chatter-mobo-app.onrender.com/";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    isRegistered: boolean;
    currentUser: string | null;
    contactStatusMap: Record<string, boolean>;
    registerUser: (phoneNumber: string) => void;
    unregisterUser: () => void;
    sendMessage: (to: string, message: string, publickey: string, file?: any, deviceId?: string) => void;
    sendFiles: (to: string, files: any[], message: string, publickey: string) => void;
    linkDevice: (socketId: string, token: string, privatekey: string, serverkey: string, Users?: any, deviceId?: string) => boolean;
    registerDevice: (phoneNumber: string, deviceId: string) => void;
    requestMessageSync: (phoneNumber: string, deviceId: string) => void;
    markMessageDelivered: (messageId: string, receiverPhone: string) => void;
    markMessageSeen: (messageId: string, receiverPhone: string) => void;
    onMessageReceived: (callback: (data: any) => void) => void;
    onStatusChanged: (callback: (data: any) => void) => void;
    onMessageSynced: (callback: (data: any) => void) => void;
    onBulkMessageSync: (callback: (data: any) => void) => void;
    onDeviceLinked: (callback: (data: any) => void) => void;
    onMessageStatusChanged: (callback: (data: any) => void) => void;
    emitTypingStart: (to: string) => void;
    emitTypingStop: (to: string) => void;
    onTypingIndicator: (callback: (data: { from: string; isTyping: boolean }) => void) => void;
    offTypingIndicator: () => void;
    offMessageReceived: () => void;
    offStatusChanged: () => void;
    offMessageSynced: () => void;
    offBulkMessageSync: () => void;
    offDeviceLinked: () => void;
    offMessageStatusChanged: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [contactStatusMap, setContactStatusMap] = useState<Record<string, boolean>>({});

    // Message and status callbacks
    const messageCallbackRef = useRef<((data: any) => void) | null>(null);
    const statusCallbackRef = useRef<((data: any) => void) | null>(null);
    const messageSyncedCallbackRef = useRef<((data: any) => void) | null>(null);
    const bulkMessageSyncCallbackRef = useRef<((data: any) => void) | null>(null);
    const deviceLinkedCallbackRef = useRef<((data: any) => void) | null>(null);
    const messageStatusChangedCallbackRef = useRef<((data: any) => void) | null>(null);
    const typingIndicatorCallbackRef = useRef<((data: { from: string; isTyping: boolean }) => void) | null>(null);

    // Initialize Socket Connection
    useEffect(() => {
        let isSocketInitialized = false;

        const initSocket = () => {
            // Avoid duplicate initialization
            if (isSocketInitialized || socketRef.current?.connected) {
                return;
            }

            isSocketInitialized = true;

            socketRef.current = io(API_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: Infinity,
                forceNew: false,
                autoConnect: true,
            });

            // Connection established
            socketRef.current.on('connect', () => {
                setIsConnected(true);
            });

            // Connection lost
            socketRef.current.on('disconnect', (_reason) => {
                setIsConnected(false);
                setIsRegistered(false);
            });

            // Connection error
            socketRef.current.on('connect_error', (error: any) => {
                console.error('⚠️ Socket connection error:', error?.message || error);
            });

            // User status changed
            socketRef.current.on('userStatusChanged', (data: any) => {
                setContactStatusMap((prev) => ({
                    ...prev,
                    [data.phoneNumber]: data.isOnline,
                }));
                statusCallbackRef.current?.(data);
            });

            // Receive message
            socketRef.current.on('Receivemessage', (data: any) => {
                messageCallbackRef.current?.(data);
            });

            // Message synced from another device
            socketRef.current.on('messageSynced', (data: any) => {
                messageSyncedCallbackRef.current?.(data);
            });

            // Bulk message sync (when device is linked)
            socketRef.current.on('bulkMessageSync', (data: any) => {
                bulkMessageSyncCallbackRef.current?.(data);
            });

            // Device linked event
            socketRef.current.on('DeviceLinked', (data: any) => {

                deviceLinkedCallbackRef.current?.(data);
            });

            // Message status changed event
            socketRef.current.on('messageStatusChanged', (data: any) => {
                messageStatusChangedCallbackRef.current?.(data);
            });

            // Bulk message status changed event
            socketRef.current.on('bulkMessageStatusChanged', (data: any) => {
                messageStatusChangedCallbackRef.current?.(data);
            });

            // Sync error
            socketRef.current.on('syncError', (data: any) => {
                console.error('❌ Sync error:', data);
            });

            // Typing indicator
            socketRef.current.on('typingIndicator', (data: { from: string; isTyping: boolean }) => {
                typingIndicatorCallbackRef.current?.(data);
            });
        };

        initSocket();

        return () => {
            // Only disconnect on unmount if socket exists
            if (socketRef.current) {
                // Don't disconnect completely - keep connection alive for other components
                socketRef.current.off('connect');
                socketRef.current.off('disconnect');
                socketRef.current.off('connect_error');
                socketRef.current.off('userStatusChanged');
                socketRef.current.off('Receivemessage');
                socketRef.current.off('messageSynced');
                socketRef.current.off('bulkMessageSync');
                socketRef.current.off('DeviceLinked');
                socketRef.current.off('messageStatusChanged');
                socketRef.current.off('bulkMessageStatusChanged');
                socketRef.current.off('syncError');
                socketRef.current.off('typingIndicator');
            }
        };
    }, []);

    // Register user - wait for connection if not ready
    const registerUser = useCallback((phoneNumber: string) => {
        if (!socketRef.current) {
            console.error('Socket not initialized');
            return;
        }

        const doRegister = () => {
            socketRef.current?.emit('register', phoneNumber);
            setCurrentUser(phoneNumber);
            setIsRegistered(true);
        };

        if (socketRef.current.connected) {
            doRegister();
        } else {
            socketRef.current.once('connect', doRegister);
        }
    }, []);

    // Unregister user
    const unregisterUser = useCallback(async () => {
        try {
            if (socketRef.current) {
                if (socketRef.current.connected) {
                    // Emit logout event if needed
                    socketRef.current.emit('logout', { phoneNumber: currentUser });
                    // Don't disconnect - keep for other components
                }
            }
            setCurrentUser(null);
            setIsRegistered(false);
            setContactStatusMap({});
            messageCallbackRef.current = null;
            statusCallbackRef.current = null;
        } catch (error) {
            console.error('Error unregistering user:', error);
        }
    }, [currentUser]);

    // Send message
    const sendMessage = useCallback(
        (to: string, message: string, publickey: string, file?: any, deviceId?: string) => {
            if (!socketRef.current) {
                console.error('Socket not initialized');
                return false;
            }

            if (!socketRef.current.connected) {
                console.warn('Socket not connected, retrying...');
                // Queue the message for later
                socketRef.current.once('connect', () => {
                    console.log('Socket reconnected, sending queued message');
                    socketRef.current?.emit('sendMessage', {
                        from: currentUser,
                        to,
                        message,
                        publickey,
                        file: file || '',
                        deviceId: deviceId || null,
                    });
                });
                return false;
            }

            socketRef.current.emit('sendMessage', {
                from: currentUser,
                to,
                message,
                publickey,
                file: file || '',
                deviceId: deviceId || null,
            });
            return true;
        },
        [currentUser]
    );

    // Send files
    const sendFiles = useCallback(
        (to: string, files: any[], message: string, publickey: string) => {
            if (!socketRef.current) {
                console.error('Socket not initialized');
                return false;
            }

            if (!socketRef.current.connected) {
                console.warn('Socket not connected for file transfer, retrying...');
                socketRef.current.once('connect', () => {
                    console.log('Socket reconnected, sending files');
                    socketRef.current?.emit('sendMessage', {
                        from: currentUser,
                        to,
                        files,
                        message,
                        publickey,
                    });
                });
                return false;
            }

            socketRef.current.emit('sendMessage', {
                from: currentUser,
                to,
                files,
                message,
                publickey,
            });
            return true;
        },
        [currentUser]
    );

    const linkDevice = useCallback(
        (socketId: string, token: string, privatekey: string, serverkey: string, Users?: any, deviceId?: string): boolean => {
            if (!socketId?.trim() || !token?.trim()) {
                return false;
            }
            if (!socketRef.current?.connected) {
                return false;
            }
            socketRef.current.emit('LinkDevice', { socketId, token, serverkey, privatekey, Users, deviceId });
            return true;
        },
        []
    );

    // Register device for chat sync
    const registerDevice = useCallback((phoneNumber: string, deviceId: string) => {
        if (!socketRef.current) {
            console.error('Socket not initialized');
            return;
        }

        if (!socketRef.current.connected) {
            console.warn('Socket not connected, waiting...');
            socketRef.current.once('connect', () => {
                socketRef.current?.emit('registerDevice', { phoneNumber, deviceId });
            });
            return;
        }

        socketRef.current.emit('registerDevice', { phoneNumber, deviceId });
    }, []);

    // Request message sync
    const requestMessageSync = useCallback((phoneNumber: string, deviceId: string) => {
        if (!socketRef.current) {
            console.error('Socket not initialized');
            return;
        }

        if (!socketRef.current.connected) {
            console.warn('Socket not connected, waiting...');
            socketRef.current.once('connect', () => {
                socketRef.current?.emit('requestMessageSync', { phoneNumber, deviceId });
            });
            return;
        }

        socketRef.current.emit('requestMessageSync', { phoneNumber, deviceId });
    }, []);

    // Mark message as delivered
    const markMessageDelivered = useCallback((messageId: string, receiverPhone: string) => {
        if (!socketRef.current) {
            console.error('Socket not initialized');
            return;
        }

        if (!socketRef.current.connected) {
            console.warn('Socket not connected for marking message as delivered');
            socketRef.current.once('connect', () => {
                socketRef.current?.emit('messageDelivered', { messageId, receiverPhone });
            });
            return;
        }

        socketRef.current.emit('messageDelivered', { messageId, receiverPhone });
    }, []);

    // Mark message as seen
    const markMessageSeen = useCallback((messageId: string, receiverPhone: string) => {
        if (!socketRef.current) {
            console.error('Socket not initialized');
            return;
        }

        if (!socketRef.current.connected) {
            console.warn('Socket not connected for marking message as seen');
            socketRef.current.once('connect', () => {
                socketRef.current?.emit('messageSeen', { messageId, receiverPhone });
            });
            return;
        }

        socketRef.current.emit('messageSeen', { messageId, receiverPhone });
    }, []);

    // Register message callback
    const onMessageReceived = useCallback((callback: (data: any) => void) => {
        messageCallbackRef.current = callback;
    }, []);

    // Unregister message callback
    const offMessageReceived = useCallback(() => {
        messageCallbackRef.current = null;
    }, []);

    // Register status callback
    const onStatusChanged = useCallback((callback: (data: any) => void) => {
        statusCallbackRef.current = callback;
    }, []);

    // Unregister status callback
    const offStatusChanged = useCallback(() => {
        statusCallbackRef.current = null;
    }, []);

    // Register message synced callback
    const onMessageSynced = useCallback((callback: (data: any) => void) => {
        messageSyncedCallbackRef.current = callback;
    }, []);

    // Unregister message synced callback
    const offMessageSynced = useCallback(() => {
        messageSyncedCallbackRef.current = null;
    }, []);

    // Register bulk message sync callback
    const onBulkMessageSync = useCallback((callback: (data: any) => void) => {
        bulkMessageSyncCallbackRef.current = callback;
    }, []);

    // Unregister bulk message sync callback
    const offBulkMessageSync = useCallback(() => {
        bulkMessageSyncCallbackRef.current = null;
    }, []);

    // Register device linked callback
    const onDeviceLinked = useCallback((callback: (data: any) => void) => {
        deviceLinkedCallbackRef.current = callback;
    }, []);

    // Unregister device linked callback
    const offDeviceLinked = useCallback(() => {
        deviceLinkedCallbackRef.current = null;
    }, []);

    // Register message status changed callback
    const onMessageStatusChanged = useCallback((callback: (data: any) => void) => {
        messageStatusChangedCallbackRef.current = callback;
    }, []);

    // Unregister message status changed callback
    const offMessageStatusChanged = useCallback(() => {
        messageStatusChangedCallbackRef.current = null;
    }, []);

    // Emit typing start
    const emitTypingStart = useCallback((to: string) => {
        if (socketRef.current?.connected && currentUser) {
            socketRef.current.emit('typingStart', { from: currentUser, to });
        }
    }, [currentUser]);

    // Emit typing stop
    const emitTypingStop = useCallback((to: string) => {
        if (socketRef.current?.connected && currentUser) {
            socketRef.current.emit('typingStop', { from: currentUser, to });
        }
    }, [currentUser]);

    // Register typing indicator callback
    const onTypingIndicator = useCallback((callback: (data: { from: string; isTyping: boolean }) => void) => {
        typingIndicatorCallbackRef.current = callback;
    }, []);

    // Unregister typing indicator callback
    const offTypingIndicator = useCallback(() => {
        typingIndicatorCallbackRef.current = null;
    }, []);

    const value: SocketContextType = {
        socket: socketRef.current,
        isConnected,
        isRegistered,
        currentUser,
        contactStatusMap,
        registerUser,
        unregisterUser,
        sendMessage,
        sendFiles,
        onMessageReceived,
        offMessageReceived,
        onStatusChanged,
        offStatusChanged,
        linkDevice,
        registerDevice,
        requestMessageSync,
        markMessageDelivered,
        markMessageSeen,
        onMessageSynced,
        onBulkMessageSync,
        onDeviceLinked,
        onMessageStatusChanged,
        offMessageSynced,
        offBulkMessageSync,
        offDeviceLinked,
        offMessageStatusChanged,
        emitTypingStart,
        emitTypingStop,
        onTypingIndicator,
        offTypingIndicator,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

// Custom hook to use socket context
export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};
