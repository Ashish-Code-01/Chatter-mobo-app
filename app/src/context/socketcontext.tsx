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

// const API_URL = "http://10.119.77.98:8000"; // Update for production
const API_URL = "https://chatter-mobo-app.onrender.com/";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    isRegistered: boolean;
    currentUser: string | null;
    contactStatusMap: Record<string, boolean>;
    registerUser: (phoneNumber: string) => void;
    unregisterUser: () => void;
    sendMessage: (to: string, message: string, publickey: string, file?: any) => void;
    sendFiles: (to: string, files: any[], message: string, publickey: string) => void;
    linkDevice: (socketId: string, token: string, privatekey: string, serverkey: string, Users?: any) => boolean;
    onMessageReceived: (callback: (data: any) => void) => void;
    onStatusChanged: (callback: (data: any) => void) => void;
    offMessageReceived: () => void;
    offStatusChanged: () => void;
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

    // Initialize Socket Connection
    useEffect(() => {
        let isSocketInitialized = false;

        const initSocket = () => {
            // Avoid duplicate initialization
            if (isSocketInitialized || socketRef.current?.connected) {
                console.log('Socket already initialized or connected');
                return;
            }

            console.log('🔌 Initializing socket connection...');
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
                console.log('✅ Socket connected successfully:', socketRef.current?.id);
                setIsConnected(true);
            });

            // Connection lost
            socketRef.current.on('disconnect', (reason) => {
                console.log('❌ Socket disconnected:', reason);
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
            console.log('📱 Registering user:', phoneNumber);
            socketRef.current?.emit('register', phoneNumber);
            setCurrentUser(phoneNumber);
            setIsRegistered(true);
            console.log('✅ User registration event emitted:', phoneNumber);
        };

        if (socketRef.current.connected) {
            doRegister();
        } else {
            // Wait for connection
            console.log('⏳ Waiting for socket connection before registering user...');
            socketRef.current.once('connect', () => {
                console.log('🔌 Socket now connected, registering user');
                doRegister();
            });
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
            console.log('✅ User unregistered');
        } catch (error) {
            console.error('Error unregistering user:', error);
        }
    }, [currentUser]);

    // Send message
    const sendMessage = useCallback(
        (to: string, message: string, publickey: string, file?: any) => {
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
        (socketId: string, token: string, serverkey: string, privatekey: string, Users?: any): boolean => {
            if (!socketId || !token) {
                console.error('SocketId or token missing for linkDevice');
                return false;
            }
            if (!socketId.trim() || !token.trim()) {
                console.error('Socket not initialized for linkDevice');
                return false;
            }
            if (!socketRef.current?.connected) {
                console.warn('Socket not connected for linkDevice');
                return false;
            }

            socketRef.current.emit('LinkDevice', { socketId, token, serverkey, privatekey, Users });
            return true;
        },
        []
    );


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
