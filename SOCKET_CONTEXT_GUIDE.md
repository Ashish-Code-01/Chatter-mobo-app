# Socket.IO Context - Implementation Guide

## Overview

The Socket.IO Context is a centralized state management solution for all real-time communication in the Chatter application. It provides a single socket connection shared across all components.

---

## Architecture

### Context Structure

```typescript
SocketContextType {
  socket: Socket | null;                    // Raw Socket.IO instance
  isConnected: boolean;                     // Connection status
  isRegistered: boolean;                    // User registration status
  currentUser: string | null;               // Current user's phone
  contactStatusMap: Record<...>;            // Online/offline status
  registerUser: (phoneNumber) => void;      // Register user
  unregisterUser: () => void;               // Unregister user
  sendMessage: (...) => void;               // Send encrypted message
  sendFiles: (...) => void;                 // Send files
  onMessageReceived: (callback) => void;    // Set message listener
  onStatusChanged: (callback) => void;      // Set status listener
  offMessageReceived: () => void;           // Remove message listener
  offStatusChanged: () => void;             // Remove status listener
}
```

### File Location

```
app/src/context/socketcontext.tsx
```

---

## Connection Flow

```
App Mount
   ↓
SocketProvider Mounts
   ↓
Initialize Socket
   ↓
Attempt Connection to Server
   ↓
On Success:
  - Set isConnected = true
  - Listen for events

On Failure:
  - Attempt reconnection
  - Exponential backoff
  - Max 5 second delay
```

---

## Usage Examples

### Basic Setup

```typescript
import { useSocket } from '../../context/socketcontext';

export default function MyComponent() {
  const { isConnected, currentUser } = useSocket();

  return (
    <View>
      <Text>Status: {isConnected ? '🟢 Online' : '🔴 Offline'}</Text>
    </View>
  );
}
```

### Register User

```typescript
const { registerUser, isConnected } = useSocket();

useEffect(() => {
  if (isConnected && user) {
    registerUser(user.phoneNumber);
  }
}, [isConnected, user, registerUser]);
```

### Send Message

```typescript
const { sendMessage } = useSocket();

const handleSend = async () => {
  const success = sendMessage(
    contactPhone, // Recipient phone
    encryptedMessage, // Encrypted message
    publicKey, // Public key for decryption
    fileUrl, // Optional file URL
  );

  if (!success) {
    console.log("Message queued, will send on reconnect");
  }
};
```

### Listen for Messages

```typescript
const { onMessageReceived, offMessageReceived } = useSocket();

useEffect(() => {
  const handleMessage = (data) => {
    console.log("Received:", data);
    // Process message
  };

  onMessageReceived(handleMessage);

  return () => {
    offMessageReceived();
  };
}, [onMessageReceived, offMessageReceived]);
```

### Send Files

```typescript
const { sendFiles } = useSocket();

const handleSendFiles = async (files) => {
  const filesData = files.map((f) => ({
    name: f.file.name,
    type: f.file.type,
    size: f.file.size,
    url: f.fileurl,
  }));

  sendFiles(contactPhone, filesData, messageText, publicKey);
};
```

### Listen for Status Changes

```typescript
const { onStatusChanged, offStatusChanged } = useSocket();

useEffect(() => {
  const handleStatusChange = ({ phoneNumber, isOnline }) => {
    setContactStatusMap((prev) => ({
      ...prev,
      [phoneNumber]: isOnline,
    }));
  };

  onStatusChanged(handleStatusChange);

  return () => {
    offStatusChanged();
  };
}, [onStatusChanged, offStatusChanged]);
```

---

## Configuration

### API URL

**File:** `app/src/context/socketcontext.tsx`

```typescript
const API_URL = "http://10.119.77.98:8000"; // Change for production
```

### Reconnection Settings

```typescript
const socket = io(API_URL, {
  transports: ["websocket", "polling"], // WebSocket + HTTP polling
  reconnection: true, // Auto-reconnect
  reconnectionDelay: 1000, // 1 second initial delay
  reconnectionDelayMax: 5000, // Max 5 second delay
  reconnectionAttempts: Infinity, // Keep trying forever
  forceNew: false, // Reuse connection
  autoConnect: true, // Auto-connect on init
});
```

---

## Event Handling

### Server Events

#### `connect`

Fired when socket successfully connects.

```typescript
socket.on("connect", () => {
  console.log("Connected:", socket.id);
  setIsConnected(true);
});
```

#### `disconnect`

Fired when socket disconnects.

```typescript
socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
  setIsConnected(false);
  setIsRegistered(false);
});
```

#### `connect_error`

Fired when connection error occurs.

```typescript
socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});
```

#### `userStatusChanged`

Fired when user comes online/goes offline.

```typescript
socket.on("userStatusChanged", ({ phoneNumber, isOnline }) => {
  // Update contact status
});
```

#### `Receivemessage`

Fired when new message arrives.

```typescript
socket.on("Receivemessage", ({ from, message, publickey, files }) => {
  // Handle incoming message
});
```

### Client Events

#### `register`

Register user as online.

```typescript
socket.emit("register", phoneNumber);
```

#### `sendMessage`

Send message to another user.

```typescript
socket.emit('sendMessage', {
  from: currentUser,
  to: contactPhone,
  message: encryptedMessage,
  publickey: publicKey,
  file: fileUrl,
  files: [{...}]  // For file transfers
});
```

#### `logout`

Unregister user (offline).

```typescript
socket.emit("logout", { phoneNumber });
```

---

## Error Handling

### Connection Errors

```typescript
const { isConnected } = useSocket();

useEffect(() => {
  if (!isConnected) {
    // Show reconnecting indicator
    // Queue operations
  }
}, [isConnected]);
```

### Message Send Failures

```typescript
const sendMessage = (to, message, key) => {
  if (!socketRef.current?.connected) {
    // Queue message for later
    // Show "message pending" indicator
    return false;
  }

  socketRef.current.emit('sendMessage', {...});
  return true;
};
```

---

## Performance Optimization

### Single Connection

- Only one socket instance created
- Shared across all components
- Reduces memory usage
- Better battery life on mobile

### Callback-Based Events

```typescript
// Efficient - no component re-renders
messageCallbackRef.current = callback;

// vs. Socket.on directly
socket.on("message", callback); // May cause re-renders
```

### Memoization

```typescript
const registerUser = useCallback((phoneNumber) => {
  // Function cached, dependencies tracked
}, []);

const sendMessage = useCallback(
  (to, msg, key) => {
    // Prevents unnecessary function recreation
  },
  [currentUser],
);
```

---

## State Management

### Local State

- `isConnected`: Connection status
- `isRegistered`: User registration status
- `currentUser`: Current user's phone number
- `contactStatusMap`: Contact online/offline status

### Ref-Based State

- `socketRef`: Socket.IO instance (persists across renders)
- `messageCallbackRef`: Message listener callback
- `statusCallbackRef`: Status listener callback

---

## Troubleshooting

### Socket Not Connecting

```typescript
// Check in console for these logs
🔌 Initializing socket connection...
✅ Socket connected successfully: [socket-id]

// If not seeing these:
// 1. Verify API_URL
// 2. Check backend is running
// 3. Check network connectivity
```

### Messages Not Received

```typescript
// Ensure:
1. User is registered: registerUser(phoneNumber)
2. Message listener is set: onMessageReceived(callback)
3. Socket is connected: isConnected === true
4. Backend is emitting events correctly
```

### Memory Leaks

```typescript
// Always cleanup:
useEffect(() => {
  onMessageReceived(handler);

  return () => {
    offMessageReceived();
  };
}, [onMessageReceived, offMessageReceived]);
```

---

## Best Practices

### ✅ Do's

- ✅ Use useSocket hook within SocketProvider
- ✅ Cleanup callbacks in useEffect return
- ✅ Check isConnected before critical operations
- ✅ Handle reconnection scenarios
- ✅ Use useCallback for callbacks
- ✅ Memoize expensive computations

### ❌ Don'ts

- ❌ Don't create multiple socket instances
- ❌ Don't forget to cleanup listeners
- ❌ Don't rely on socket being connected immediately
- ❌ Don't store socket in regular state
- ❌ Don't call socket.disconnect() in components
- ❌ Don't use socket.on directly in components

---

## Advanced Topics

### Custom Hooks Based on useSocket

```typescript
export const useMessages = (contactPhone) => {
  const [messages, setMessages] = useState([]);
  const { onMessageReceived, offMessageReceived } = useSocket();

  useEffect(() => {
    const handler = (data) => {
      if (data.from === contactPhone) {
        setMessages((prev) => [...prev, data]);
      }
    };

    onMessageReceived(handler);

    return () => {
      offMessageReceived();
    };
  }, [contactPhone, onMessageReceived, offMessageReceived]);

  return messages;
};
```

### Message Queue During Offline

```typescript
const messageQueueRef = useRef([]);

const sendMessageWithQueue = (to, message, key) => {
  if (!isConnected) {
    messageQueueRef.current.push({ to, message, key });

    // Wait for reconnection
    socket.once("connect", () => {
      while (messageQueueRef.current.length > 0) {
        const msg = messageQueueRef.current.shift();
        sendMessage(msg.to, msg.message, msg.key);
      }
    });
  } else {
    sendMessage(to, message, key);
  }
};
```

---

## Testing

### Mock Socket Context

```typescript
const mockSocket = {
  isConnected: true,
  isRegistered: true,
  currentUser: 'test123',
  contactStatusMap: {},
  registerUser: jest.fn(),
  sendMessage: jest.fn(),
  // ... other properties
};

<SocketContext.Provider value={mockSocket}>
  <ComponentToTest />
</SocketContext.Provider>
```

---

## Version History

- **v1.0.0** - Initial implementation with connection management, event handling, and message queue support
