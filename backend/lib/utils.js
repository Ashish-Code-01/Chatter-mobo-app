import jwt from 'jsonwebtoken';
import twilio from "twilio";

export function generateToken(userId) {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
    return token;
}


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

export async function sendOTP(phoneNumber, otp) {
    try {
        const message = await client.messages.create({
            body: `Your OTP is ${otp}. It will expire in 10 minutes.`,
            from: twilioPhone,
            to: phoneNumber,
        });

        console.log("OTP sent successfully:", message.sid);
        return message;
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        throw new Error("Failed to send OTP. Please try again later.");
    }
}
