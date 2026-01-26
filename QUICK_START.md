# Quick Start Guide

Get Chatter up and running in minutes!

---

## 🚀 5-Minute Setup

### Prerequisites

- Node.js v16+
- Git
- MongoDB Atlas account (free tier available)
- Cloudinary account (free tier available)

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/Chatter-full-stack.git
cd Chatter-full-stack

# Setup backend
cd backend
npm install

# Setup mobile app
cd ../app
npm install

# Setup web app
cd ../web-app
npm install
```

### Step 2: Configure Environment

**Backend (.env)**

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatter
JWT_SECRET=your-secret-key-here
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
CORS_ORIGIN=*
```

### Step 3: Start Services

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Server running on http://localhost:8000
```

**Terminal 2 - Mobile:**

```bash
cd app
npm run dev
# In another terminal: npm run android or npm run ios
```

**Terminal 3 - Web:**

```bash
cd web-app
npm run dev
# App running on http://localhost:5173
```

### Step 4: Test

1. Open mobile app or web app
2. Create account with phone number
3. Add a contact
4. Send a message
5. Verify real-time delivery

---

## 📱 Mobile App First Run

### Android

```bash
cd app
npx react-native run-android
```

### iOS (macOS only)

```bash
cd app
npx react-native run-ios
```

### Troubleshooting

**Metro bundler not starting?**

```bash
npm run dev -- --reset-cache
```

**Connection error?**

- Update `API_URL` in `app/src/context/socketcontext.tsx`
- Ensure backend is running
- Check network connectivity

---

## 🌐 Web App First Run

```bash
cd web-app
npm run dev
# Open http://localhost:5173
```

---

## 🔧 Backend First Run

```bash
cd backend
npm run dev
# Server will be ready on http://localhost:8000
```

### Verify Backend

```bash
# Should return 200 OK
curl http://localhost:8000
```

---

## 🔐 First Steps After Installation

### 1. Create Your First Account

**Mobile:**

1. Open app
2. Tap "Sign Up"
3. Enter phone number
4. Verify OTP (check console for test OTP)
5. Create password
6. Add profile details

**Web:**

1. Open app
2. Click "Sign Up"
3. Same process as mobile

### 2. Add a Contact

1. Get another user's phone number
2. Tap "Add Contact"
3. Enter phone number
4. Start chatting!

### 3. Test Messaging

1. Open chat
2. Type message
3. Tap send
4. Message appears in real-time

### 4. Test File Sharing

1. Open chat
2. Tap attachment icon
3. Select document
4. Add optional message
5. Tap send

---

## 📋 Common Tasks

### Reset Database

```bash
# Delete all data
mongo
> use chatter
> db.dropDatabase()
```

### Clear App Cache

**Mobile:**

```bash
# Android
cd app
npx react-native run-android -- --reset-cache

# iOS
cd app/ios
rm -rf Pods
pod install
cd ..
npx react-native run-ios
```

**Web:**

```bash
# Clear browser cache or use DevTools → Application → Storage → Clear Site Data
```

### View Backend Logs

```bash
cd backend
npm run dev
# Logs appear in console
```

### Enable Debug Mode

**Mobile:**

```typescript
// In socketcontext.tsx
console.log("🔌 Initializing socket connection...");
// Shows detailed connection logs
```

---

## 🎯 Feature Testing Checklist

### Authentication

- [ ] Sign up with phone number
- [ ] Verify OTP
- [ ] Login with credentials
- [ ] Logout successfully

### Messaging

- [ ] Send text message
- [ ] Receive message in real-time
- [ ] Message appears in history
- [ ] Message gets encrypted/decrypted

### Contacts

- [ ] Add contact
- [ ] View contact list
- [ ] See online/offline status
- [ ] Sync device contacts

### Files

- [ ] Attach document
- [ ] Preview before sending
- [ ] Send successfully
- [ ] Receive file

### Device Linking

- [ ] Generate QR code
- [ ] Scan QR code
- [ ] Link device
- [ ] View linked devices

---

## 🚨 Troubleshooting

### "Socket connection error"

```bash
# Check backend is running
curl http://localhost:8000

# Check API_URL in config
# Update if needed and restart app
```

### "Messages not syncing"

```bash
# Verify user is registered
# Check Socket.IO logs
# Ensure socket is connected (green indicator)
```

### "Cannot decrypt messages"

```bash
# Clear app storage: AsyncStorage.clear()
# Re-login with account
# Verify keys are generated properly
```

### "File upload fails"

```bash
# Check file size (max 10MB)
# Verify Cloudinary credentials
# Check network connection
```

### "App crashes on startup"

```bash
# Clear cache: npm run dev -- --reset-cache
# Reinstall: npm install
# Check Node version: node --version (must be v16+)
```

---

## 📚 Next Steps

1. **Read Documentation**
   - [README.md](README.md) - Full project overview
   - [SOCKET_CONTEXT_GUIDE.md](SOCKET_CONTEXT_GUIDE.md) - Context implementation
   - [BACKEND_API.md](BACKEND_API.md) - API reference

2. **Customize the App**
   - Update colors/branding
   - Add more features
   - Deploy to production

3. **Secure Your Setup**
   - Generate strong JWT secret
   - Set up HTTPS
   - Configure firewall
   - Enable rate limiting

4. **Deploy**
   - Backend to Heroku/Railway/AWS
   - Mobile to Google Play/App Store
   - Web to Vercel/Netlify

---

## 💡 Pro Tips

### Development

- Use `console.log` for debugging
- Check Redux DevTools for state
- Use React DevTools for component inspection
- Test with different network speeds

### Performance

- Use memoization (React.memo, useMemo)
- Lazy load screens
- Optimize images
- Use pagination for messages

### Security

- Always use HTTPS in production
- Validate all inputs
- Use strong passwords
- Keep dependencies updated

---

## 🤝 Getting Help

### Resources

- GitHub Issues: Report bugs
- Discussions: Ask questions
- Documentation: Detailed guides
- Discord Community: Real-time chat

### Contact

- Email: support@chatter.app
- Twitter: @ChatterApp
- Website: www.chatter.app

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend server running on port 8000
- [ ] Mobile app running and connecting
- [ ] Web app accessible on localhost:5173
- [ ] Can create account
- [ ] Can send message
- [ ] Can see real-time updates
- [ ] Socket.IO connected (console)
- [ ] No errors in console

If all checked, you're ready to go! 🎉

---

**Happy Chatting! 💬**
