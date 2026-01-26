# Chatter - Real-Time Chat Application

**Full-Stack Mobile, Web & Backend Chat Platform with Encryption**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-ISC-green)
![React Native](https://img.shields.io/badge/React%20Native-0.82.1-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Socket.IO Events](#socketio-events)
- [Message Encryption](#message-encryption)
- [File Management](#file-management)
- [Authentication](#authentication)
- [Troubleshooting](#troubleshooting)
- [Build & Deployment](#build--deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

Chatter is a comprehensive real-time chat application built with React Native, allowing users to communicate securely across mobile and web platforms. It features:

- **Real-time messaging** using Socket.IO
- **End-to-end message encryption** using custom cipher algorithm
- **File and document sharing** via Cloudinary
- **Multi-device support** with device linking
- **Online/offline status** tracking
- **Contact management** with phone number synchronization
- **QR code scanning** for device linking

---

## ✨ Features

### Core Features

- ✅ Real-time text messaging
- ✅ End-to-end encryption (custom cipher)
- ✅ File and document sharing
- ✅ Contact list management
- ✅ Online/offline status indicators
- ✅ Message read status
- ✅ Unseen message counter
- ✅ User profile management

### Security Features

- ✅ JWT authentication
- ✅ Message encryption with secret keys
- ✅ Private & public key management
- ✅ Secure OTP-based login
- ✅ Device linking with QR codes

### User Experience

- ✅ Dark theme UI
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Intuitive navigation
- ✅ Real-time user presence
- ✅ Message timestamps

---

## 🛠 Tech Stack

### Mobile (React Native)

```
- React Native 0.82.1
- React Navigation 7.1.18
- Socket.IO Client 4.8.1
- Axios for API calls
- AsyncStorage for local data
- React Native Contacts
- React Native Permissions
- Document Picker
- QR Code Scanner
```

### Backend (Node.js)

```
- Express.js 5.1.0
- Socket.IO 4.8.1
- MongoDB (Mongoose 8.19.2)
- JWT for authentication
- Twilio for SMS/OTP
- Cloudinary for file uploads
- CORS enabled
```

### Web (React + Vite)

```
- React 19.2.0
- React Router DOM 7.12.0
- Socket.IO Client 4.8.3
- Tailwind CSS 4.1.18
- Vite for bundling
- QR Code generation
```

---

## 🏗 Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Chatter Application                        │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐          ┌────────┐
   │  Mobile │          │   Web    │          │ Device │
   │  (RN)   │          │ (React)  │          │Linking │
   └────┬────┘          └────┬─────┘          └────┬───┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Socket.IO     │
                    │   (Real-time)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌──────────┐         ┌─────────┐        ┌──────────┐
   │ Express  │         │ MongoDB │        │Cloudinary│
   │  API     │         │(Storage)│        │(Files)   │
   └──────────┘         └─────────┘        └──────────┘
```

### Data Flow

```
User Input → Socket.IO → Backend → MongoDB
                ↓              ↓
            Encrypt        Broadcast
                ↓              ↓
          AsyncStorage ← Socket.IO ← Receiver
```

---

## 📁 Project Structure

```
Chatter-full-stack/
├── app/                          # React Native Mobile App
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── WelcomeScreen.tsx
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── OtpScreen.tsx
│   │   │   │   ├── EditDetails.tsx
│   │   │   │   └── updateUserDetails.tsx
│   │   │   └── dashbord/
│   │   │       ├── Home.tsx
│   │   │       ├── chatToContact.tsx
│   │   │       ├── AddContact.tsx
│   │   │       ├── previewDocs.tsx
│   │   │       ├── linkdevice.tsx
│   │   │       └── qr-scanner.tsx
│   │   ├── context/
│   │   │   └── socketcontext.tsx      # Socket.IO Context
│   │   └── assets/
│   ├── App.tsx                        # Root App Component
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                      # Node.js Express API
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── message.controller.js
│   │   ├── contact.controller.js
│   │   └── device.controller.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── message.model.js
│   │   ├── contact.model.js
│   │   └── device.model.js
│   ├── routes/
│   │   ├── user.route.js
│   │   ├── message.route.js
│   │   ├── contact.route.js
│   │   └── device.route.js
│   ├── middleware/
│   │   └── auth.js
│   ├── lib/
│   │   ├── dbconnect.js
│   │   └── utils.js
│   ├── server.js                     # Entry point
│   ├── package.json
│   └── .env
│
└── web-app/                      # React Web Application
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   │   └── home.jsx
    │   ├── context/
    │   ├── utils/
    │   │   └── socket.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── package.json
    ├── vite.config.js
    └── index.html
```

---

## 📦 Prerequisites

### System Requirements

- **Node.js**: v16.x or higher
- **npm**: v7.x or higher
- **Android Studio**: Latest version (for Android build)
- **Xcode**: Latest version (for iOS build, macOS only)
- **MongoDB**: Local or Atlas account
- **Cloudinary**: Account for file uploads

### Accounts Required

- MongoDB Atlas account
- Cloudinary account (for image/file uploads)
- Twilio account (for SMS/OTP)
- Git for version control

---

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Chatter-full-stack.git
cd Chatter-full-stack
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
# (See Configuration section)

# Start development server
npm run dev

# Or start production server
npm start
```

### 3. Mobile App Setup

```bash
cd app

# Install dependencies
npm install

# Install pods (iOS only)
cd ios
pod install
cd ..

# Start Metro bundler
npm run dev

# For Android
npm run android

# For iOS
npm run ios
```

### 4. Web App Setup

```bash
cd web-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## ⚙️ Configuration

### Backend Configuration (.env)

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatter

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Cloudinary (File Uploads)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio (SMS/OTP)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# CORS
CORS_ORIGIN=*

# Socket.IO
SOCKET_RECONNECTION_DELAY=1000
SOCKET_RECONNECTION_DELAY_MAX=5000
```

### Mobile App Configuration

Update API URL in files:

- `app/src/context/socketcontext.tsx`
- `app/src/screens/dashbord/chatToContact.tsx`
- `app/src/screens/dashbord/Home.tsx`

```typescript
const API_URL = "http://10.119.77.98:8000"; // Change for production
```

### Web App Configuration

Update API URL in `web-app/src/utils/socket.js`:

```javascript
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
```

---

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Server runs on http://localhost:8000
```

**Terminal 2 - Mobile:**

```bash
cd app
npm run dev
# Metro bundler runs on http://localhost:8081
# In another terminal: npm run android or npm run ios
```

**Terminal 3 - Web:**

```bash
cd web-app
npm run dev
# App runs on http://localhost:5173
```

### Production Build

**Backend:**

```bash
cd backend
npm start
```

**Mobile (Android APK):**

```bash
cd app/android
./gradlew assembleRelease
# APK located at: app/build/outputs/apk/release/app-release.apk
```

**Mobile (iOS IPA):**

```bash
cd app/ios
xcodebuild -workspace Chatter.xcworkspace \
  -scheme Chatter \
  -configuration Release \
  -archivePath ./build/Chatter.xcarchive archive

xcodebuild -exportArchive \
  -archivePath ./build/Chatter.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath ./build/
```

**Web:**

```bash
cd web-app
npm run build
# Static files in dist/ directory
# Deploy to Vercel, Netlify, or any static host
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Login with Phone & Password

```
POST /auth/login
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "phoneNumber": "+919876543210",
    "avatar": "url"
  }
}
```

#### Get Current User

```
POST /auth/me
Headers: { token: "jwt_token" }

Response:
{
  "success": true,
  "user": { /* user object */ }
}
```

#### OTP Verification

```
POST /auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "token": "jwt_token"
}
```

### Message Endpoints

#### Get Messages

```
POST /api/messages/get/:contactPhone
Headers: { token: "jwt_token" }

Response:
{
  "success": true,
  "data": [
    {
      "_id": "message_id",
      "sender": "+919876543210",
      "receiver": "+919876543211",
      "content": "encrypted_message",
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

{
  "receiverPhoneNumber": "+919876543210"
}

Response:
{
  "success": true,
  "message": "Messages marked as seen"
}
```

### Contact Endpoints

#### Sync Contacts

```
POST /api/contact/sync
Headers: { token: "jwt_token" }

{
  "contacts": [
    {
      "displayName": "John",
      "phoneNumber": "9876543210"
    }
  ]
}
```

#### Get User by Phone

```
GET /auth/user/:phoneNumber

Response:
{
  "success": true,
  "data": {
    "phoneNumber": "+919876543210",
    "name": "John Doe",
    "avatar": "url"
  }
}
```

### Status Endpoints

#### Get Online Status

```
GET /api/online/status/:phoneNumber

Response:
{
  "success": true,
  "data": {
    "phoneNumber": "+919876543210",
    "isOnline": true
  }
}
```

---

## 📨 Socket.IO Events

### Client → Server Events

#### Register User

```javascript
socket.emit("register", phoneNumber);
// Tells server this user is now online
```

#### Send Message

```javascript
socket.emit("sendMessage", {
  from: "+919876543210",
  to: "+919876543211",
  message: "encrypted_message",
  publickey: "public_key",
  file: "file_url",
});
```

#### User Logout

```javascript
socket.emit("logout", {
  phoneNumber: "+919876543210",
});
```

### Server → Client Events

#### Receive Message

```javascript
socket.on("Receivemessage", (data) => {
  const { from, message, publickey, files } = data;
  // Handle incoming message
});
```

#### User Status Changed

```javascript
socket.on("userStatusChanged", (data) => {
  const { phoneNumber, isOnline } = data;
  // Update UI with online/offline status
});
```

---

## 🔐 Message Encryption

### Encryption Algorithm

Uses a **Vigenère cipher** with custom alphabet:

```
Alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'_-&@#$%*()/:<>|+=
```

### Key Generation

```typescript
// Private Key: User's unique key
const privatekey = "user_specific_key";

// Server Key: Generated at registration
const serverkey = "server_generated_key";

// Secret Key: Combined for encryption
const secretKey = privatekey + serverkey;
```

### Encryption Process

```typescript
const encryptMessage = (text: string, key: string): string => {
  let encryptedText = "";

  for (let i = 0; i < text.length; i++) {
    const textChar = text[i];
    const keyChar = key[i % key.length];

    const textIndex = alphabet.indexOf(textChar);
    const keyIndex = alphabet.indexOf(keyChar);

    if (textIndex === -1) {
      encryptedText += textChar; // Keep unknown chars as-is
    } else {
      const newIndex = (textIndex + keyIndex) % alphabet.length;
      encryptedText += alphabet[newIndex];
    }
  }

  return encryptedText;
};
```

### Decryption Process

```typescript
const decryptMessage = (encryptedText: string, key: string): string => {
  let decryptedText = "";

  for (let i = 0; i < encryptedText.length; i++) {
    const encryptedChar = encryptedText[i];
    const keyChar = key[i % key.length];

    const encryptedIndex = alphabet.indexOf(encryptedChar);
    const keyIndex = alphabet.indexOf(keyChar);

    if (encryptedIndex === -1) {
      decryptedText += encryptedChar;
    } else {
      let newIndex = encryptedIndex - keyIndex;
      if (newIndex < 0) newIndex += alphabet.length;
      decryptedText += alphabet[newIndex];
    }
  }

  return decryptedText;
};
```

---

## 📁 File Management

### File Upload Process

1. **Select Files** - Use document picker
2. **Validate** - Max 10MB per file
3. **Upload to Cloudinary** - Get secure URL
4. **Send via Socket.IO** - Include file metadata
5. **Store Locally** - Cache in AsyncStorage

### Supported File Types

- Images: JPG, PNG, GIF, WebP
- Documents: PDF, Word, Excel
- Videos: MP4, WebM
- Audio: MP3, WAV
- Archives: ZIP, RAR

### Cloudinary Integration

```typescript
const uploadDocumentToCloudinary = async (
  imageUri: string,
  filetype: string,
  filename: string,
) => {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: filetype,
    name: filename,
  });
  formData.append("upload_preset", "chatter_unsigned");

  const response = await axios.post(
    "https://api.cloudinary.com/v1_1/dqmxpgv5k/image/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return response.data.secure_url;
};
```

---

## 🔑 Authentication

### Login Flow

```
1. User enters phone number and password
   ↓
2. Backend verifies credentials
   ↓
3. Generate JWT token
   ↓
4. Store token in AsyncStorage
   ↓
5. Fetch user profile
   ↓
6. Save user data
   ↓
7. Navigate to Home screen
```

### OTP Flow

```
1. User enters phone number
   ↓
2. Backend sends OTP via Twilio
   ↓
3. User enters OTP code
   ↓
4. Verify OTP on backend
   ↓
5. Create account & generate JWT
   ↓
6. Redirect to edit profile
```

### Token Management

**Store:**

```typescript
await AsyncStorage.setItem("token", token);
await AsyncStorage.setItem("User", JSON.stringify(user));
```

**Retrieve:**

```typescript
const token = await AsyncStorage.getItem("token");
const user = await AsyncStorage.getItem("User");
```

**Send in Requests:**

```typescript
const headers = { token: savedToken };
```

---

## 🐛 Troubleshooting

### Connection Issues

**Problem:** "Socket connection error"
**Solutions:**

- Verify backend is running on correct port
- Check API_URL in configuration
- Ensure network connectivity
- Check firewall settings

**Problem:** "Socket not connected, cannot register user"
**Solution:** Already fixed! New context waits for connection

### Authentication Issues

**Problem:** "Invalid token"
**Solution:**

- Clear AsyncStorage: `await AsyncStorage.clear()`
- Re-login with valid credentials
- Check token expiration

**Problem:** "OTP not received"
**Solution:**

- Verify Twilio configuration
- Check phone number format
- Ensure SMS provider quota

### Message Issues

**Problem:** "Messages not syncing"
**Solution:**

- Check socket connection status
- Verify user is registered
- Check message encryption keys
- Review backend logs

**Problem:** "Cannot decrypt messages"
**Solution:**

- Ensure secret keys are properly stored
- Check key format and integrity
- Verify encryption algorithm

### File Upload Issues

**Problem:** "File upload failed"
**Solution:**

- Check file size (max 10MB)
- Verify Cloudinary credentials
- Check network connection
- Ensure file type is supported

---

## 🏗 Build & Deployment

### Android Deployment

```bash
# Generate signing key
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias chatter

# Build release APK
cd android
./gradlew assembleRelease

# Or build AAB for Google Play
./gradlew bundleRelease
```

### iOS Deployment

```bash
# Archive for distribution
cd ios
xcodebuild -workspace Chatter.xcworkspace \
  -scheme Chatter \
  -configuration Release \
  -archivePath ./build/Chatter.xcarchive archive

# Upload to App Store
xcodebuild -exportArchive \
  -archivePath ./build/Chatter.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath ./build/
```

### Web Deployment

**Vercel:**

```bash
npm install -g vercel
cd web-app
vercel
```

**Netlify:**

```bash
npm run build
# Deploy dist/ folder to Netlify
```

**Traditional Server:**

```bash
npm run build
# Copy dist/ contents to web server
```

### Backend Deployment (Heroku)

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create chatter-app

# Add MongoDB Atlas connection
heroku config:set MONGODB_URI=mongodb+srv://...

# Deploy
git push heroku main
```

---

## 🤝 Contributing

### Development Guidelines

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write meaningful commit messages
- Test your changes before submitting

### Bug Reports

Include:

- Environment details
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable

---

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 👥 Authors

- **Ashish** - Backend Development
- **Tanuj** - Mobile & Web Development

---

## 📧 Support

For support, email support@chatter.app or open an issue on GitHub.

---

## 🔄 Version History

### v1.0.0 (Current)

- ✅ Core messaging features
- ✅ Socket.IO context implementation
- ✅ Message encryption
- ✅ File sharing
- ✅ Device linking
- ✅ Multi-platform support

### Future Features (Planned)

- 🔜 Group chats
- 🔜 Voice/video calls
- 🔜 Message search
- 🔜 Message reactions/emojis
- 🔜 Push notifications
- 🔜 Message archiving
- 🔜 User blocking

---

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Socket.IO Guide](https://socket.io/docs/v4/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Cloudinary Docs](https://cloudinary.com/documentation)

---

**Last Updated:** January 19, 2026  
**Maintained by:** Development Team
