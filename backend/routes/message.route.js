import express from "express";
import { getMessagesBetweenUsers, sendMessageToUser } from "../controllers/message.controller.js";
import { authenticate } from "../middleware/auth.js";
const messageRoute = express.Router();

messageRoute.post("/send", authenticate, sendMessageToUser);
messageRoute.post("/get/:otherUserPhoneNumber", authenticate, getMessagesBetweenUsers);

export default messageRoute