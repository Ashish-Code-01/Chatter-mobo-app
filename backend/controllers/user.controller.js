import User from "../models/user.model.js";
import Contact from "../models/contact.model.js";
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

        console.log(token);


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


// sync contacts

export const syncContacts = async (req, res) => {
    try {
        const userId = req.user._id;
        const { contacts } = req.body;

        if (!contacts || !Array.isArray(contacts)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contacts data"
            });
        }

        // Format phone numbers and filter valid contacts
        const formattedContacts = contacts
            .filter(contact => contact.phoneNumber)
            .map(contact => ({
                displayName: contact.displayName,
                phoneNumber: contact.phoneNumber.replace(/[^\d+]/g, ''),
                email: contact.email
            }));

        // Update or create contact list for user
        await Contact.findOneAndUpdate(
            { userId },
            {
                userId,
                contacts: formattedContacts
            },
            { upsert: true, new: true }
        );

        // Find registered users from contacts
        const registeredUsers = await User.find({
            phoneNumber: {
                $in: formattedContacts.map(c => c.phoneNumber)
            }
        }).select('phoneNumber name avatar');

        return res.status(200).json({
            success: true,
            message: "Contacts synced successfully",
            data: {
                registeredUsers
            }
        });
    } catch (error) {
        console.error("Contact sync error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// get registered contacts

export const getRegisteredContacts = async (req, res) => {
    try {
        const userId = req.user._id;

        const userContacts = await Contact.findOne({ userId });
        if (!userContacts) {
            return res.status(200).json({
                success: true,
                data: {
                    contacts: []
                }
            });
        }

        // Process each contact and check registration status
        const processedContacts = await Promise.all(
            userContacts.contacts.map(async (contact) => {
                const registeredUser = await User.findOne({
                    phoneNumber: contact.phoneNumber
                }).select('phoneNumber name avatar');

                return {
                    ...contact.toObject(),
                    isRegistered: !!registeredUser,
                    userData: registeredUser || null
                };
            })
        );

        // Separate registered and unregistered contacts
        const registeredContacts = processedContacts.filter(contact => contact.isRegistered);
        const unregisteredContacts = processedContacts.filter(contact => !contact.isRegistered);

        return res.status(200).json({
            success: true,
            data: {
                contacts: {
                    registered: registeredContacts,
                    unregistered: unregisteredContacts,
                }
            }
        });
    } catch (error) {
        console.error("Error fetching registered contacts:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};