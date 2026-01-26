# Backend API Documentation

## Overview

Chatter Backend is a Node.js/Express server with Socket.IO for real-time communication. It manages user authentication, messages, contacts, and device linking.

---

## Table of Contents

- [Server Setup](#server-setup)
- [Database Models](#database-models)
- [REST API Endpoints](#rest-api-endpoints)
- [Socket.IO Events](#socketio-events)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Middleware](#middleware)

---

## Server Setup

### Environment Variables (.env)

```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatter

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d

# Cloudinary
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# CORS
CORS_ORIGIN=*
```

### Start Server

```bash
npm run dev     # Development
npm start       # Production
```

---

## Database Models

### User Model

```javascript
{
  phoneNumber: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: String,
  email: String,
  avatar: String,
  privatekey: String,
  serverkey: String,
  devices: [
    {
      deviceId: String,
      name: String,
      linkedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model

```javascript
{
  sender: {
    type: String,
    ref: 'User'
  },
  receiver: {
    type: String,
    ref: 'User'
  },
  content: String,           // Encrypted
  files: [
    {
      url: String,
      name: String,
      type: String,
      size: Number
    }
  ],
  seen: {
    type: Boolean,
    default: false
  },
  createdAt: Date
}
```

### Contact Model

```javascript
{
  user: {
    type: String,
    ref: 'User'
  },
  contact: {
    type: String,
    ref: 'User'
  },
  displayName: String,
  addedAt: Date
}
```

### Device Model

```javascript
{
  user: {
    type: String,
    ref: 'User'
  },
  deviceId: String,
  deviceName: String,
  linkedAt: Date,
  lastActive: Date
}
```

---

## REST API Endpoints

### Authentication

#### Register User

```
POST /auth/register
Content-Type: application/json

Request:
{
  "phoneNumber": "+919876543210",
  "password": "password123",
  "name": "John Doe",
  "email": "john@example.com"
}

Response: 201
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "phoneNumber": "+919876543210",
    "name": "John Doe",
    "privatekey": "...",
    "serverkey": "..."
  }
}
```

#### Login

```
POST /auth/login
Content-Type: application/json

Request:
{
  "phoneNumber": "+919876543210",
  "password": "password123"
}

Response: 200
{
  "success": true,
  "token": "jwt_token",
  "user": { /* user object */ }
}
```

#### Request OTP

```
POST /auth/request-otp
Content-Type: application/json

Request:
{
  "phoneNumber": "+919876543210"
}

Response: 200
{
  "success": true,
  "message": "OTP sent to phone"
}
```

#### Verify OTP

```
POST /auth/verify-otp
Content-Type: application/json

Request:
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}

Response: 200
{
  "success": true,
  "token": "jwt_token",
  "user": { /* user object */ }
}
```

#### Get Current User

```
POST /auth/me
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "user": {
    "phoneNumber": "+919876543210",
    "name": "John Doe",
    "avatar": "url",
    "email": "john@example.com"
  }
}
```

#### Update User Profile

```
PUT /auth/update-profile
Headers: { token: "jwt_token" }

Request:
{
  "name": "John Smith",
  "email": "john@example.com",
  "avatar": "image_url"
}

Response: 200
{
  "success": true,
  "user": { /* updated user */ }
}
```

#### Get User by Phone

```
GET /auth/user/:phoneNumber

Response: 200
{
  "success": true,
  "data": {
    "phoneNumber": "+919876543210",
    "name": "John Doe",
    "avatar": "url"
  }
}
```

---

### Messages

#### Get All Messages

```
POST /api/messages/get/msg/all
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "data": [
    {
      "_id": "msg_id",
      "sender": "+919876543210",
      "receiver": "+919876543211",
      "content": "encrypted_message",
      "seen": false,
      "createdAt": "2024-01-19T10:30:00Z"
    }
  ]
}
```

#### Get Messages with Specific Contact

```
POST /api/messages/get/:contactPhone
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "data": [
    {
      "_id": "msg_id",
      "sender": "+919876543210",
      "receiver": "+919876543211",
      "content": "encrypted_message",
      "files": [],
      "seen": false,
      "createdAt": "2024-01-19T10:30:00Z"
    }
  ]
}
```

#### Mark Messages as Seen

```
POST /api/messages/seen
Headers: { token: "jwt_token" }

Request:
{
  "receiverPhoneNumber": "+919876543210"
}

Response: 200
{
  "success": true,
  "message": "Messages marked as seen"
}
```

#### Delete Message

```
DELETE /api/messages/:messageId
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "message": "Message deleted"
}
```

---

### Contacts

#### Sync Device Contacts

```
POST /api/contact/sync
Headers: { token: "jwt_token" }

Request:
{
  "contacts": [
    {
      "displayName": "John Doe",
      "phoneNumber": "9876543210"
    },
    {
      "displayName": "Jane Smith",
      "phoneNumber": "9876543211"
    }
  ]
}

Response: 200
{
  "success": true,
  "synced": 2,
  "message": "Contacts synced"
}
```

#### Get User Contacts

```
GET /api/contact/list
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "data": [
    {
      "_id": "contact_id",
      "contact": {
        "phoneNumber": "+919876543211",
        "name": "John Doe",
        "avatar": "url"
      },
      "displayName": "John Doe"
    }
  ]
}
```

#### Add Contact Manually

```
POST /api/contact/add
Headers: { token: "jwt_token" }

Request:
{
  "contactPhone": "+919876543211"
}

Response: 200
{
  "success": true,
  "message": "Contact added"
}
```

---

### Online Status

#### Get User Status

```
GET /api/online/status/:phoneNumber

Response: 200
{
  "success": true,
  "data": {
    "phoneNumber": "+919876543210",
    "isOnline": true,
    "lastSeen": "2024-01-19T10:30:00Z"
  }
}
```

#### Get All Online Users

```
GET /api/online/all

Response: 200
{
  "success": true,
  "data": {
    "+919876543210": true,
    "+919876543211": false,
    "+919876543212": true
  }
}
```

---

### Devices

#### Link Device

```
POST /api/device/link
Headers: { token: "jwt_token" }

Request:
{
  "deviceId": "unique_device_id",
  "deviceName": "iPhone 12"
}

Response: 200
{
  "success": true,
  "device": {
    "deviceId": "unique_device_id",
    "deviceName": "iPhone 12",
    "linkedAt": "2024-01-19T10:30:00Z"
  }
}
```

#### Get Linked Devices

```
GET /api/device/list
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "data": [
    {
      "deviceId": "device_id_1",
      "deviceName": "iPhone 12",
      "linkedAt": "2024-01-19T10:30:00Z",
      "lastActive": "2024-01-19T10:35:00Z"
    }
  ]
}
```

#### Unlink Device

```
DELETE /api/device/:deviceId
Headers: { token: "jwt_token" }

Response: 200
{
  "success": true,
  "message": "Device unlinked"
}
```

---

## Socket.IO Events

### Server-Side Events Listening

#### `connection`

```javascript
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle registration
  socket.on("register", (phoneNumber) => {
    // Associate socket with user
    userSocketMap[phoneNumber] = socket.id;

    // Broadcast online status
    io.emit("userStatusChanged", {
      phoneNumber,
      isOnline: true,
    });
  });
});
```

#### `register`

Client registers as online.

```javascript
socket.on("register", (phoneNumber) => {
  userSocketMap[phoneNumber] = socket.id;
  socket.join(phoneNumber); // Join room with phone number

  // Broadcast to all users
  io.emit("userStatusChanged", {
    phoneNumber,
    isOnline: true,
  });
});
```

#### `sendMessage`

Client sends a message.

```javascript
socket.on("sendMessage", async (data) => {
  const { from, to, message, publickey, files } = data;

  // Save to database
  const msg = new Message({
    sender: from,
    receiver: to,
    content: message,
    files: files || [],
    seen: false,
  });

  await msg.save();

  // Send to recipient if online
  const recipientSocketId = userSocketMap[to];
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("Receivemessage", {
      from,
      message,
      publickey,
      files,
    });
  }
});
```

#### `logout`

Client logs out.

```javascript
socket.on("logout", (data) => {
  const { phoneNumber } = data;

  delete userSocketMap[phoneNumber];
  socket.leave(phoneNumber);

  // Broadcast offline status
  io.emit("userStatusChanged", {
    phoneNumber,
    isOnline: false,
  });
});
```

#### `disconnect`

Client disconnects.

```javascript
socket.on("disconnect", () => {
  // Find and remove user from map
  for (const [phone, id] of Object.entries(userSocketMap)) {
    if (id === socket.id) {
      delete userSocketMap[phone];
      io.emit("userStatusChanged", {
        phoneNumber: phone,
        isOnline: false,
      });
      break;
    }
  }
});
```

### Server → Client Events

#### `Receivemessage`

```javascript
socket.emit("Receivemessage", {
  from: "+919876543210",
  message: "encrypted_message",
  publickey: "public_key",
  files: [
    {
      url: "file_url",
      name: "file.pdf",
      type: "application/pdf",
      size: 1024000,
    },
  ],
});
```

#### `userStatusChanged`

```javascript
io.emit("userStatusChanged", {
  phoneNumber: "+919876543210",
  isOnline: true,
});
```

---

## Authentication

### JWT Token Structure

```javascript
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "phoneNumber": "+919876543210",
  "iat": 1234567890,
  "exp": 1234654290
}

Signature: HMACSHA256(base64(header) + '.' + base64(payload), secret)
```

### Using Token in Requests

```javascript
// In headers
headers: {
  token: "jwt_token_from_login";
}

// Server-side verification
const token = req.headers.token;
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// decoded.phoneNumber available
```

---

## Error Handling

### Standard Error Response

```javascript
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

### Common HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Server Error

### Error Examples

**Missing Token:**

```json
{
  "success": false,
  "error": "No token provided",
  "status": 401
}
```

**Invalid Credentials:**

```json
{
  "success": false,
  "error": "Invalid phone or password",
  "status": 401
}
```

**User Not Found:**

```json
{
  "success": false,
  "error": "User not found",
  "status": 404
}
```

---

## Middleware

### Authentication Middleware

```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};

// Usage
app.post("/api/messages/get/:contactPhone", authMiddleware, (req, res) => {
  // Handler
});
```

### Error Handling Middleware

```javascript
app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || "Server error",
  });
});
```

---

## Database Queries

### Find User by Phone

```javascript
const user = await User.findOne({ phoneNumber });
```

### Get Messages Between Two Users

```javascript
const messages = await Message.find({
  $or: [
    { sender: phone1, receiver: phone2 },
    { sender: phone2, receiver: phone1 },
  ],
}).sort({ createdAt: 1 });
```

### Mark Messages as Seen

```javascript
await Message.updateMany(
  {
    sender: senderPhone,
    receiver: receiverPhone,
    seen: false,
  },
  { seen: true },
);
```

### Get Unseen Messages

```javascript
const unseen = await Message.find({
  receiver: phoneNumber,
  seen: false,
}).select("sender");
```

---

## Best Practices

### ✅ Do's

- ✅ Always verify JWT token
- ✅ Hash passwords before storing
- ✅ Validate input data
- ✅ Use database indexes
- ✅ Handle errors gracefully
- ✅ Log important events
- ✅ Use environment variables
- ✅ Implement rate limiting

### ❌ Don'ts

- ❌ Don't send passwords in responses
- ❌ Don't trust client-side validation
- ❌ Don't expose sensitive error details
- ❌ Don't hardcode secrets
- ❌ Don't allow arbitrary file uploads
- ❌ Don't skip authentication checks
- ❌ Don't keep unnecessary socket connections

---

## Testing

### Using cURL

```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "password": "password123"
  }'

# Get current user
curl -X POST http://localhost:8000/auth/me \
  -H "token: jwt_token_here"

# Get messages
curl -X POST http://localhost:8000/api/messages/get/919876543211 \
  -H "token: jwt_token_here"
```

### Using Postman

1. Create a new collection
2. Set base URL: `http://localhost:8000`
3. Create requests with auth token in headers
4. Test WebSocket events with Socket.IO client

---

## Deployment Checklist

- [ ] Set production environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Configure auto-restart
- [ ] Test all endpoints
- [ ] Load test the server
