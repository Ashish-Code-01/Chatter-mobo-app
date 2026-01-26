# Development & Architecture Guide

Complete guide for developers contributing to the Chatter project.

---

## Table of Contents

- [Project Architecture](#project-architecture)
- [Development Environment](#development-environment)
- [Code Structure](#code-structure)
- [Development Workflow](#development-workflow)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)

---

## Project Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Client Layer (Mobile/Web)       │
│  ┌──────────────┐      ┌──────────────┐ │
│  │ React Native │      │ React + Vite │ │
│  │   (Mobile)   │      │   (Web)      │ │
│  └──────┬───────┘      └──────┬───────┘ │
└─────────┼────────────────────┼──────────┘
          │                    │
          │   Socket.IO / HTTP │
          │                    │
┌─────────▼────────────────────▼──────────┐
│        Application Layer (Node.js)      │
│  ┌─────────────────────────────────┐    │
│  │   Express.js Server + Socket.IO │    │
│  │  ┌──────────┐  ┌──────────────┐ │    │
│  │  │Routes    │  │WebSocket     │ │    │
│  │  │Controllers│ │Events        │ │    │
│  │  │Middleware │  │Handlers      │ │    │
│  │  └──────────┘  └──────────────┘ │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────┐
│      Data Layer (MongoDB)             │
│  ┌──────────────────────────────────┐ │
│  │ Collections:                     │ │
│  │ - Users                          │ │
│  │ - Messages                       │ │
│  │ - Contacts                       │ │
│  │ - Devices                        │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────┐
│     External Services                 │
│  ┌──────────────────────────────────┐ │
│  │ Cloudinary (File Upload)         │ │
│  │ Twilio (SMS/OTP)                 │ │
│  │ MongoDB Atlas (Database)         │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Data Flow

```
User Action (Mobile/Web)
        ↓
Socket.IO / HTTP Request
        ↓
Express Router
        ↓
Middleware (Auth, Validation)
        ↓
Controller (Business Logic)
        ↓
Model (Database Operations)
        ↓
Response (Socket.IO / JSON)
        ↓
Update UI / State
```

---

## Development Environment

### Required Tools

```bash
# Node.js and npm
node --version  # v16+
npm --version   # v7+

# Git
git --version

# Android (optional)
android --version

# Xcode (macOS only)
xcode-select --install
```

### IDE Setup

**Recommended: VS Code**

Extensions:

- ESLint
- Prettier
- Thunder Client / REST Client
- MongoDB for VS Code
- React Native Tools
- ES7+ React/Redux/React-Native snippets

Settings (.vscode/settings.json):

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "javascript.updateImportsOnFileMove.enabled": "always",
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

---

## Code Structure

### Mobile App Structure

```
app/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.tsx       # Landing page
│   │   │   ├── LoginScreen.tsx         # Login form
│   │   │   ├── OtpScreen.tsx           # OTP verification
│   │   │   ├── EditDetails.tsx         # Profile setup
│   │   │   └── updateUserDetails.tsx   # Profile update
│   │   └── dashbord/
│   │       ├── Home.tsx                # Contact list
│   │       ├── chatToContact.tsx       # Chat screen
│   │       ├── AddContact.tsx          # Add contact form
│   │       ├── previewDocs.tsx         # File preview
│   │       ├── linkdevice.tsx          # Device linking
│   │       └── qr-scanner.tsx          # QR scanner
│   ├── context/
│   │   └── socketcontext.tsx           # Socket.IO context
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── utils/
│   │   └── encryption.ts               # Cipher functions
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   └── styles/
│       └── theme.ts                    # Theme colors
├── App.tsx                              # Root component
├── package.json
└── tsconfig.json
```

### Backend Structure

```
backend/
├── controllers/
│   ├── user.controller.js              # User operations
│   ├── message.controller.js           # Message operations
│   ├── contact.controller.js           # Contact operations
│   └── device.controller.js            # Device operations
├── models/
│   ├── user.model.js                   # User schema
│   ├── message.model.js                # Message schema
│   ├── contact.model.js                # Contact schema
│   └── device.model.js                 # Device schema
├── routes/
│   ├── user.route.js                   # User endpoints
│   ├── message.route.js                # Message endpoints
│   ├── contact.route.js                # Contact endpoints
│   └── device.route.js                 # Device endpoints
├── middleware/
│   ├── auth.js                         # JWT verification
│   ├── errorHandler.js                 # Error handling
│   ├── validation.js                   # Input validation
│   └── rateLimit.js                    # Rate limiting
├── lib/
│   ├── dbconnect.js                    # Database connection
│   ├── utils.js                        # Helper functions
│   ├── cloudinary.js                   # Cloudinary setup
│   └── twilio.js                       # Twilio setup
├── server.js                            # Entry point
├── package.json
└── .env
```

### Web App Structure

```
web-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── ContactList.jsx
│   │   └── MessageInput.jsx
│   ├── pages/
│   │   ├── home.jsx                    # Home page
│   │   ├── login.jsx                   # Login page
│   │   └── chat.jsx                    # Chat page
│   ├── context/
│   │   └── SocketContext.jsx           # Socket context
│   ├── utils/
│   │   ├── socket.js                   # Socket setup
│   │   ├── api.js                      # API calls
│   │   └── encryption.js               # Encryption
│   ├── styles/
│   │   └── index.css                   # Styles
│   ├── App.jsx                         # Root component
│   └── main.jsx                        # Entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git add .
git commit -m "feat: add amazing feature"

# Keep up with main
git fetch origin
git rebase origin/main

# Push to remote
git push origin feature/amazing-feature

# Create Pull Request on GitHub
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Testing
- `chore:` Build/dependencies

**Examples:**

```
feat(socket): add reconnection handling
fix(auth): resolve token expiration issue
docs(readme): update installation steps
```

### Branch Naming

```
feature/feature-name          # New features
bugfix/bug-description        # Bug fixes
docs/documentation-name       # Documentation
refactor/refactor-description # Code improvements
```

---

## Best Practices

### React/React Native

✅ **Do's:**

- Use functional components with hooks
- Implement custom hooks for logic reuse
- Use useCallback for event handlers
- Memoize expensive computations
- Keep components small and focused
- Use proper TypeScript types
- Implement error boundaries

❌ **Don'ts:**

- Avoid class components
- Don't mutate state directly
- Don't use useCallback without dependencies
- Don't prop-drill unnecessary data
- Don't create components inside render
- Don't ignore TypeScript warnings

### Example: Good Component

```typescript
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useSocket } from '../../context/socketcontext';

interface Props {
  contactPhone: string;
  onMessageSent?: () => void;
}

const ChatComponent: React.FC<Props> = ({ contactPhone, onMessageSent }) => {
  const [message, setMessage] = useState('');
  const { sendMessage, isConnected } = useSocket();

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const success = sendMessage(contactPhone, message, '');

    if (success) {
      setMessage('');
      onMessageSent?.();
    }
  }, [message, contactPhone, sendMessage, onMessageSent]);

  return (
    <View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type message..."
      />
      <Button
        onPress={handleSend}
        disabled={!isConnected}
        title="Send"
      />
    </View>
  );
};

export default React.memo(ChatComponent);
```

### Node.js / Express

✅ **Do's:**

- Use async/await for async operations
- Implement proper error handling
- Validate all input data
- Use environment variables
- Implement logging
- Use middleware for common tasks
- Follow REST conventions

❌ **Don'ts:**

- Don't use callback hell
- Don't skip input validation
- Don't expose sensitive errors
- Don't hardcode secrets
- Don't ignore security headers
- Don't make blocking operations

### Example: Good Controller

```javascript
// controllers/message.controller.js
import Message from "../models/message.model.js";
import { validatePhone } from "../lib/utils.js";

export const getMessages = async (req, res, next) => {
  try {
    const { contactPhone } = req.params;
    const { phoneNumber } = req.user;

    // Validate input
    if (!validatePhone(contactPhone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number",
      });
    }

    // Fetch messages
    const messages = await Message.find({
      $or: [
        { sender: phoneNumber, receiver: contactPhone },
        { sender: contactPhone, receiver: phoneNumber },
      ],
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Performance Optimization

### Mobile App

```typescript
// Use React.memo for expensive components
const Message = React.memo(({ item }) => {
  return <Text>{item.message}</Text>;
}, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id;
});

// Use useMemo for expensive calculations
const sortedMessages = useMemo(() => {
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}, [messages]);

// Use useCallback for stable function references
const handlePress = useCallback(() => {
  navigation.navigate('Detail');
}, [navigation]);

// Virtual list for large lists
<FlatList
  data={messages}
  renderItem={renderMessage}
  keyExtractor={(item) => item.id}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
/>
```

### Backend

```javascript
// Use database indexes
Message.collection.createIndex({ sender: 1, receiver: 1, createdAt: -1 });

// Use lean() for read-only queries
const messages = await Message.find(...).lean();

// Implement pagination
const page = req.query.page || 1;
const limit = 20;
const skip = (page - 1) * limit;

const messages = await Message.find(...)
  .skip(skip)
  .limit(limit);

// Use aggregation pipeline for complex queries
const stats = await Message.aggregate([
  { $match: { receiver: phoneNumber } },
  { $group: { _id: '$sender', count: { $sum: 1 } } }
]);
```

### Web

```jsx
// Code splitting
const ChatPage = lazy(() => import('./pages/ChatPage'));

// Image optimization
<img src={image} loading="lazy" alt="..." />

// Virtual scrolling
<FixedSizeList
  height={600}
  itemCount={1000}
  itemSize={35}
  width="100%"
>
  {renderRow}
</FixedSizeList>

// Debounce expensive operations
const debouncedSearch = useCallback(
  debounce((query) => {
    searchContacts(query);
  }, 300),
  []
);
```

---

## Testing Strategy

### Unit Tests

```typescript
// message.utils.test.ts
import { encryptMessage, decryptMessage } from "./encryption";

describe("Message Encryption", () => {
  it("should encrypt and decrypt message", () => {
    const message = "Hello World";
    const key = "secretkey123";

    const encrypted = encryptMessage(message, key);
    const decrypted = decryptMessage(encrypted, key);

    expect(decrypted).toBe(message);
  });

  it("should handle special characters", () => {
    const message = "Hello! @#$% 123";
    const key = "key";

    const encrypted = encryptMessage(message, key);
    const decrypted = decryptMessage(encrypted, key);

    expect(decrypted).toBe(message);
  });
});
```

### Integration Tests

```javascript
// routes/message.test.js
import request from "supertest";
import app from "../server.js";

describe("Message API", () => {
  it("should get messages", async () => {
    const response = await request(app)
      .post("/api/messages/get/919876543210")
      .set("token", validToken);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("should return 401 without token", async () => {
    const response = await request(app).post("/api/messages/get/919876543210");

    expect(response.status).toBe(401);
  });
});
```

### End-to-End Tests

```javascript
// cypress/integration/chat.spec.js
describe("Chat Flow", () => {
  it("should send and receive message", () => {
    cy.visit("localhost:5173");
    cy.login("9876543210", "password");
    cy.selectContact("John");
    cy.typeMessage("Hello");
    cy.clickSend();
    cy.contains("Hello").should("be.visible");
  });
});
```

---

## Deployment

### Development Build

```bash
# Backend
npm run dev

# Mobile
npm run dev

# Web
npm run dev
```

### Production Build

**Backend:**

```bash
npm run build  # If build script exists
npm start
```

**Mobile:**

```bash
# Android
cd android
./gradlew bundleRelease

# iOS
cd ios
xcodebuild -workspace Chatter.xcworkspace -scheme Chatter -configuration Release
```

**Web:**

```bash
npm run build
# Deploy dist/ directory
```

### Environment Management

```bash
# .env.development
NODE_ENV=development
API_URL=http://localhost:8000

# .env.production
NODE_ENV=production
API_URL=https://api.chatter.app
```

### Deployment Checklist

- [ ] All tests pass
- [ ] No console errors/warnings
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL certificates valid
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backups scheduled
- [ ] Monitoring setup

---

## Debugging

### Browser DevTools

```javascript
// React DevTools
// - Inspect component hierarchy
// - Monitor state changes
// - Profile performance

// Network Tab
// - Monitor API calls
// - Check WebSocket connection
// - Review response times

// Console
// - View logs
// - Test APIs
// - Debug JavaScript
```

### React Native Debugger

```bash
# Start debugger
npm install -g react-devtools

# In app
open debugger-exp://localhost:19000
```

### Backend Logging

```javascript
// Enable detailed logging
process.env.DEBUG = 'chatter:*'

// View logs
npm run dev 2>&1 | tee logs.txt
```

---

## Resources

- [React Documentation](https://react.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Express.js Guide](https://expressjs.com/)
- [Socket.IO Docs](https://socket.io/docs/v4/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated:** January 19, 2026
