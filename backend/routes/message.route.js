import express from "express";
import { getMessagesBetweenUsers, getMessagesForMe, getMessagesByChatId, seenmsg, syncMessagesForDevice, updateMessageStatus, markMessagesDelivered } from "../controllers/message.controller.js";
import { authenticate } from "../middleware/auth.js";
const messageRoute = express.Router();

// Get messages by chatId (format: chat_phone1_phone2) - for web app
messageRoute.get("/chat/:chatId", authenticate, getMessagesByChatId);

messageRoute.post("/get/:otherUserPhoneNumber", authenticate, getMessagesBetweenUsers);
messageRoute.post("/get/msg/all", authenticate, getMessagesForMe);
messageRoute.post("/seen", authenticate, seenmsg);
messageRoute.post("/sync", authenticate, syncMessagesForDevice);
messageRoute.post("/status/update", authenticate, updateMessageStatus);
messageRoute.post("/status/delivered", authenticate, markMessagesDelivered);


export default messageRoute