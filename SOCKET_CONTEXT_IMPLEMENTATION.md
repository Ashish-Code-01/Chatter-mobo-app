# Socket.IO Context Implementation & Optimization Guide

## Overview

This document outlines the Socket.IO context implementation and optimizations applied to the Chatter React Native app.

---

## Key Changes

### 1. **Socket.IO Context Created** (`src/context/socketcontext.tsx`)

A centralized Socket.IO context that manages:

- Single socket connection instance (prevent multiple connections)
- Connection state management
- User registration/unregistration
- Message and status event listeners
- Automatic reconnection with exponential backoff

#### Features:

```typescript
- isConnected: Boolean indicating socket connection status
- isRegistered: Boolean indicating if user is registered
- currentUser: Current user's phone number
- contactStatusMap: Real-time contact online/offline status
- registerUser(): Register user with socket
- unregisterUser(): Clean disconnect
- sendMessage(): Send encrypted messages
- sendFiles(): Send file transfers
- onMessageReceived/offMessageReceived: Message callbacks
- onStatusChanged/offStatusChanged: Status change callbacks
```

---

### 2. **Refactored Components**

#### **chatToContact.tsx**

**Before:** Created new socket instance on component mount
**After:** Uses socket context via `useSocket()` hook

**Improvements:**

- ✅ Single shared socket connection
- ✅ Proper cleanup with callback registration
- ✅ Memoized alphabets string and chatId
- ✅ useCallback for performance-critical functions
- ✅ Removed socketRef dependency
- ✅ Cleaner effect dependencies

#### **previewDocs.tsx**

**Before:** Created new socket on file send, passed socketRef through route
**After:** Uses socket context for file transmission

**Improvements:**

- ✅ No socket creation in component
- ✅ Removed socketRef from route params
- ✅ useCallback for handlers
- ✅ Cleaner socket interaction

#### **Home.tsx**

**Before:** Global socket variable, manual event listener management
**After:** Uses socket context with provider pattern

**Improvements:**

- ✅ Removed global socket variable
- ✅ Proper event listener cleanup
- ✅ useCallback for handlers
- ✅ Centralized registration on initialization
- ✅ Context-based status updates

#### **App.tsx**

**Before:** No context provider
**After:** Wrapped with SocketProvider

**Improvements:**

- ✅ Separated navigation into RootNavigator component
- ✅ Added SocketProvider wrapper
- ✅ Better component organization
- ✅ Proper loading state handling

---

## Performance Optimizations

### 1. **Memory Management**

- Single socket instance prevents memory leaks from multiple connections
- Proper cleanup on component unmount
- Event listeners properly deregistered

### 2. **Memoization**

- `useMemo` for constant values (alphabet, chatId)
- `useCallback` for event handlers
- Prevents unnecessary re-renders

### 3. **Connection Pooling**

- Reuses single socket connection across all components
- Automatic reconnection (configured)
- Reduced network overhead

### 4. **Event Listener Optimization**

- Callback-based listener registration (no direct socket.on in components)
- Proper listener cleanup prevents memory leaks
- Dynamic listener updates based on dependencies

### 5. **AsyncStorage Optimization**

- Message deduplication to prevent duplicates
- Batch storage operations
- Efficient state updates with proper batching

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│           App.tsx (Root)                │
│      ┌─────────────────────────┐        │
│      │   SocketProvider        │        │
│      │  (Single Connection)    │        │
│      │                         │        │
│      │  ┌──────────────────┐   │        │
│      │  │  RootNavigator   │   │        │
│      │  │                  │   │        │
│      │  │ ┌──────────────┐ │   │        │
│      │  │ │ HomeScreen   │ │   │        │
│      │  │ │ (useSocket)  │ │   │        │
│      │  │ └──────────────┘ │   │        │
│      │  │                  │   │        │
│      │  │ ┌──────────────┐ │   │        │
│      │  │ │ChatToContact │ │   │        │
│      │  │ │ (useSocket)  │ │   │        │
│      │  │ └──────────────┘ │   │        │
│      │  │                  │   │        │
│      │  │ ┌──────────────┐ │   │        │
│      │  │ │PreviewDocs   │ │   │        │
│      │  │ │ (useSocket)  │ │   │        │
│      │  │ └──────────────┘ │   │        │
│      │  └──────────────────┘   │        │
│      └─────────────────────────┘        │
└─────────────────────────────────────────┘
```

---

## Usage Examples

### Using Socket Context in Components

```typescript
import { useSocket } from '../../context/socketcontext';

export default function MyComponent() {
  const {
    socket,
    isConnected,
    sendMessage,
    onMessageReceived,
    offMessageReceived
  } = useSocket();

  // Register message listener
  useEffect(() => {
    const handleMessage = (data) => {
      console.log('Message received:', data);
    };

    onMessageReceived(handleMessage);

    return () => {
      offMessageReceived();
    };
  }, [onMessageReceived, offMessageReceived]);

  // Send message
  const handleSend = () => {
    sendMessage(contactPhone, encryptedMsg, publickey);
  };

  return (
    // Component JSX
  );
}
```

---

## Benefits Summary

| Aspect               | Before             | After                    |
| -------------------- | ------------------ | ------------------------ |
| **Connections**      | Multiple instances | Single instance          |
| **Memory**           | Potential leaks    | Managed cleanup          |
| **Code Duplication** | High               | Low (centralized)        |
| **State Management** | Component-level    | Context-level            |
| **Error Handling**   | Basic              | Centralized with logging |
| **Testing**          | Difficult          | Easier with context      |
| **Scalability**      | Limited            | Extensible               |

---

## Reconnection Strategy

The socket context automatically handles reconnection with:

- Initial delay: 1000ms
- Max delay: 5000ms
- Max attempts: 5
- Exponential backoff between attempts

---

## Future Enhancements

1. **Add Redux/Zustand** for complex state management
2. **Implement message queue** for offline support
3. **Add typing indicators** using socket events
4. **Implement message read receipts**
5. **Add presence indicators** (user is typing, last seen)
6. **Error boundary** for socket errors
7. **Logger middleware** for debugging
8. **Testing suite** with mock socket

---

## Migration Checklist

- ✅ Created SocketProvider in context
- ✅ Updated chatToContact.tsx
- ✅ Updated previewDocs.tsx
- ✅ Updated Home.tsx
- ✅ Wrapped App.tsx with provider
- ✅ Added useCallback for optimization
- ✅ Added useMemo for constants
- ✅ Removed global socket variables
- ✅ Proper cleanup in useEffect
- ✅ Error handling in socket events

---

## Troubleshooting

### Connection Issues

- Check API_URL in socketcontext.tsx
- Verify backend is running
- Check browser console for connection errors

### Messages Not Receiving

- Ensure user is registered via `registerUser()`
- Check message callback is registered
- Verify socket is connected (`isConnected` flag)

### Memory Leaks

- Ensure offMessageReceived() is called in cleanup
- Check useEffect cleanup functions
- Monitor component unmount in React DevTools

---

## Notes

- Update `API_URL` in `socketcontext.tsx` for production
- Ensure proper error handling at app level
- Consider adding socket state persistence
- Monitor socket events in production using logging
