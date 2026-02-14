import User from "../models/user.model.js";

// Link a new device
export const linkDevice = async (req, res) => {
    const { deviceName, deviceModel, osVersion } = req.body;
    const userId = req.user._id;

    if (!deviceName || !deviceModel || !osVersion) {
        return res.status(400).json({
            success: false,
            message: "Device name, model, and OS version are required"
        });
    }

    try {
        const deviceId = `${deviceModel}-${Date.now()}`;
        const device = {
            deviceId,
            deviceName,
            deviceModel,
            osVersion,
            linkedAt: new Date(),
            lastActive: new Date(),
            isPrimary: false
        };

        const user = await User.findByIdAndUpdate(
            userId,
            { $push: { devices: device } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Device linked successfully",
            data: {
                deviceId,
                deviceName
            }
        });
    } catch (error) {
        console.error("Error linking device:", error);
        return res.status(500).json({
            success: false,
            message: "Error linking device"
        });
    }
};

// Get all linked devices
export const getLinkedDevices = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await User.findById(userId).select('devices');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: user.devices || []
        });
    } catch (error) {
        console.error("Error fetching devices:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching devices"
        });
    }
};

// Get device details
export const getDeviceDetails = async (req, res) => {
    const { deviceId } = req.params;
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const device = user.devices.find(d => d.deviceId === deviceId);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: device
        });
    } catch (error) {
        console.error("Error fetching device details:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching device details"
        });
    }
};

// Unlink a device
export const unlinkDevice = async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: "Device ID is required"
        });
    }

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { devices: { deviceId } } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Device unlinked successfully"
        });
    } catch (error) {
        console.error("Error unlinking device:", error);
        return res.status(500).json({
            success: false,
            message: "Error unlinking device"
        });
    }
};

// Set primary device
export const setPrimaryDevice = async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: "Device ID is required"
        });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Set all devices to non-primary
        user.devices.forEach(device => {
            device.isPrimary = false;
        });

        // Set the specified device as primary
        const deviceToUpdate = user.devices.find(d => d.deviceId === deviceId);
        if (deviceToUpdate) {
            deviceToUpdate.isPrimary = true;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Primary device updated successfully"
        });
    } catch (error) {
        console.error("Error setting primary device:", error);
        return res.status(500).json({
            success: false,
            message: "Error setting primary device"
        });
    }
};

// Update device activity
export const updateDeviceActivity = async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: "Device ID is required"
        });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const device = user.devices.find(d => d.deviceId === deviceId);
        if (device) {
            device.lastActive = new Date();
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Device activity updated"
        });
    } catch (error) {
        console.error("Error updating device activity:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating device activity"
        });
    }
};
