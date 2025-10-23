import express from "express";
import { loginUser, verifyUser, updateUser } from "../controllers/user.controller.js";
const userRoute = express.Router();

userRoute.post("/login", loginUser);
userRoute.post("/verify", verifyUser);
userRoute.put("/update", updateUser);

export default userRoute