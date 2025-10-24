import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

// login user
export const loginUser = async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    try {
        const opt = Math.floor(100000 + Math.random() * 900000);
        await User.create({ phoneNumber, otp: opt });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error Occuring : ", error.message);

    }
}

// verify user
export const verifyUser = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json({
            success: false,
            message: "Phone number and OTP are required"
        });
    }

    try {
        const user = await User.findOne({ phoneNumber });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.otp !== parseInt(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        user.isverified = true;
        user.otp = null;
        await user.save();

        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            data: {
                user,
                token
            }
        });
    } catch (error) {
        console.error("Error in verifyUser:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
}


// update name and avatar
export const updateUser = async (req, res) => {
    const { name, avatar } = req.body;
    const userId = req.user._id;

    try {
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        let updatedUser;

        // If avatar is not provided, just update the name
        if (!avatar) {
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { name },
                { new: true }
            ).select('-password'); // Exclude password from response
            
            return res.status(200).json({ 
                success: true, 
                data: updatedUser 
            });
        }

        // If avatar exists and it's a base64 string or data URI, upload to Cloudinary
        if (avatar && (avatar.startsWith('data:image') || avatar.startsWith('http') === false)) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(avatar, {
                    folder: "avatars",
                    resource_type: "auto",
                    transformation: [
                        { width: 500, height: 500, crop: "fill", gravity: "face" },
                        { quality: "auto" },
                        { fetch_format: "auto" }
                    ]
                });

                updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        name,
                        avatar: uploadResponse.secure_url
                    },
                    { new: true }
                ).select('-password');

                return res.status(200).json({
                    success: true,
                    data: updatedUser
                });

            } catch (cloudinaryError) {
                console.error("Cloudinary Upload Error:", cloudinaryError);
                return res.status(400).json({
                    success: false,
                    message: "Failed to upload image",
                    error: cloudinaryError.message
                });
            }
        }

        // If avatar is already a URL (existing image), just update with it
        updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                avatar
            },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            data: updatedUser
        });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};