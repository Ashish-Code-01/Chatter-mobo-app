import express from "express";
import { getMessagesBetweenUsers, getMessagesForMe, seenmsg, sendMessageToUser } from "../controllers/message.controller.js";
import { authenticate } from "../middleware/auth.js";
const messageRoute = express.Router();

messageRoute.post("/send", authenticate, sendMessageToUser);
messageRoute.post("/get/:otherUserPhoneNumber", authenticate, getMessagesBetweenUsers);
messageRoute.post("/get/msg/all", authenticate, getMessagesForMe);
messageRoute.post("/seen", authenticate, seenmsg);


export default messageRoute