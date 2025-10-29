import User from "../models/user.model.js";
import Contact from "../models/contact.model.js";
import { generateToken, sendOTP } from "../lib/utils.js";

// login user
export const loginUser = async (req, res) => {
    const { phoneNumber } = req.body;

    // Validate phone number format
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message: "Valid 10-digit phone number is required"
        });
    }

    const phone = "+91" + phoneNumber;

    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Set OTP expiration (e.g., 10 minutes from now)
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        // Use findOneAndUpdate with upsert to avoid duplicate key errors
        const user = await User.findOneAndUpdate(
            { phoneNumber: phone },
            {
                otp,
                otpExpiry,
                phoneNumber: phone
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                runValidators: false
            }
        );


        // TODO: Send OTP via SMS service
        sendOTP(phone, otp)

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        console.error("Error in loginUser:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Full error:", error);

        return res.status(500).json({
            success: false,
            message: "An error occurred while processing your request",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// verify user
export const verifyUser = async (req, res) => {
    const { phoneNumber, otp } = req.body;

        const phone = "+91" + phoneNumber;

    if (!phone || !otp) {
        return res.status(400).json({
            success: false,
            message: "Phone number and OTP are required"
        });
    }

    try {
        const user = await User.findOne({ phone });

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
    try {
        const { name, avatar } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: user not found in request",
            });
        }

        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }


        // 🧾 Update user in DB
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name: name, avatar: avatar },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error("Server Error in updateUser:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
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