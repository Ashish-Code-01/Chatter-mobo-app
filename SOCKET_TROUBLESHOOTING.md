# Socket Connection Troubleshooting Guide

## Fixed Issues

✅ **Early Disconnect** - Socket was disconnecting immediately on mount
✅ **Race Condition** - Added connection waiting before registration
✅ **Missing Fallback Transport** - Added polling as fallback for websocket
✅ **Infinite Reconnection Attempts** - Changed from 5 to Infinity for better reliability
✅ **Message Queue** - Added auto-retry for messages when socket reconnects

## How to Diagnose Connection Issues

### 1. Check Backend Server

```bash
# Make sure your backend is running
# Server should be listening on: http://10.119.77.98:8000
# or your configured API_URL

# Test if server is running
curl http://10.119.77.98:8000
```

### 2. Verify API_URL

Update `API_URL` in `socketcontext.tsx` if needed:

```typescript
const API_URL = "http://10.119.77.98:8000"; // Change this for production/development
```

### 3. Check Console Logs

Look for these messages in your React Native debugger:

**Success (Good Signs)**

```
🔌 Initializing socket connection...
✅ Socket connected successfully: [socket-id]
📱 Registering user: [phone-number]
✅ User registration event emitted: [phone-number]
```

**Errors (Problems)**

```
⚠️ Socket connection error: [error message]
❌ Socket disconnected: [reason]
Socket not initialized
```

### 4. Network Connectivity

- Verify your device/emulator can reach the backend server
- Check if backend has CORS enabled for Socket.IO
- Ensure websocket ports are not blocked by firewall

### 5. Backend Configuration

Make sure your backend has Socket.IO configured with CORS:

```javascript
// Example for Node.js/Express backend
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Listen for register event
io.on("connection", (socket) => {
  socket.on("register", (phoneNumber) => {
    console.log("User registered:", phoneNumber);
    // Associate socket with user
  });

  socket.on("sendMessage", (data) => {
    // Handle message
    io.to(data.to).emit("Receivemessage", {
      from: data.from,
      message: data.message,
      publickey: data.publickey,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Broadcast offline status
  });
});
```

## Connection Flow

```
1. SocketProvider mounts
   ↓
2. Socket initializes with websocket (+ polling fallback)
   ↓
3. Socket attempts to connect to API_URL
   ↓
4. On 'connect' event: isConnected = true
   ↓
5. Component calls registerUser()
   ↓
6. If socket already connected: emit 'register' immediately
   If not connected: wait for 'connect' event, then emit 'register'
   ↓
7. User is registered and ready to send/receive messages
```

## Common Issues & Solutions

### Issue: "Socket connection error: Error: xhr poll error"

**Cause:** WebSocket connection failed, polling fallback not working
**Solution:**

- Check backend is running
- Verify API_URL is correct
- Check network connectivity
- Ensure backend allows HTTP polling

### Issue: "Socket not initialized"

**Cause:** Socket context not properly initialized
**Solution:**

- Ensure App.tsx is wrapped with `<SocketProvider>`
- Check if useSocket() is called within SocketProvider

### Issue: "Socket not connected, cannot register user"

**Cause:** registerUser() called before socket connects
**Solution:** Already fixed! registerUser() now waits for connection

### Issue: Messages not being received

**Cause:**

- User not registered
- Message event name mismatch
- Socket disconnected
  **Solution:**
- Check console for registration confirmation
- Verify backend emits 'Receivemessage' event
- Check isConnected flag in component

### Issue: Constant reconnection loop

**Cause:** Backend disconnecting or socket config issue
**Solution:**

- Check backend logs for errors
- Verify CORS settings
- Check backend event handlers

## Testing Connection

Add this to your Home screen temporarily:

```typescript
import { useSocket } from '../../context/socketcontext';

export default function Home() {
  const { isConnected, registerUser } = useSocket();

  return (
    <View>
      <Text>Connection Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</Text>
      <TouchableOpacity onPress={() => registerUser('test123')}>
        <Text>Test Register</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Performance Tips

1. **Socket initialization** is done once on app mount
2. **Connection is kept alive** across all screens
3. **Message queue** automatically retries on reconnection
4. **No memory leaks** - proper cleanup on component unmount
5. **Event listeners** are callback-based for efficiency

## Next Steps

1. Start your backend server
2. Update API_URL if needed
3. Run the app
4. Check console for connection logs
5. Test message sending/receiving

If issues persist, share the console logs and we'll debug further!
