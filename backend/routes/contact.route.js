import express from "express";
import { getRegisteredContacts, syncContacts } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
const contactRoute = express.Router();

contactRoute.post("/sync", authenticate, syncContacts);
contactRoute.post("/registered", authenticate, getRegisteredContacts);

export default contactRoute;