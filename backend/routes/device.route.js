import express from "express";
import {
    linkDevice,
    getLinkedDevices,
    unlinkDevice,
    setPrimaryDevice,
    updateDeviceActivity,
    getDeviceDetails
} from "../controllers/device.controller.js";
import { authenticate } from "../middleware/auth.js";

const deviceRoute = express.Router();

// Link a new device
deviceRoute.post("/link", authenticate, linkDevice);

// Get all linked devices
deviceRoute.get("/list", authenticate, getLinkedDevices);

// Get device details
deviceRoute.get("/:deviceId", authenticate, getDeviceDetails);

// Unlink a device
deviceRoute.post("/unlink", authenticate, unlinkDevice);

// Set primary device
deviceRoute.post("/set-primary", authenticate, setPrimaryDevice);

// Update device activity
deviceRoute.post("/activity", authenticate, updateDeviceActivity);

export default deviceRoute;
