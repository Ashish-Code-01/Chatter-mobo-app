import express from "express";
import { loginUser, verifyUser, updateUser, getuser, getAvatar } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
const userRoute = express.Router();

userRoute.post("/login", loginUser);
userRoute.post("/verify", verifyUser);
userRoute.put("/update", authenticate, updateUser);
userRoute.post("/me", authenticate, getuser);
userRoute.get("/user/:contactPhone", getAvatar);


export default userRoute