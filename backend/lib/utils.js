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

export function generateServerPublicKey(length = 16) {
    // Ensure valid length: min 1, max 16
    length = Math.floor(Number(length)) || 16;
    if (length < 1) length = 1;
    if (length > 16) length = 16;

    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const special = "!@#$%^&*()-_=+[]{};:,.<>/?~`|";
    const all = lower + upper + digits + special;

    // Secure random integer generator
    function randInt(max) {
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            crypto.getRandomValues(arr);
            return arr[0] % max;
        } else {
            return Math.floor(Math.random() * max);
        }
    }

    const password = new Array(length);

    // Ensure at least one special character
    const specialPos = randInt(length);
    password[specialPos] = special[randInt(special.length)];

    // Fill the rest with random characters
    for (let i = 0; i < length; i++) {
        if (i === specialPos) continue;
        password[i] = all[randInt(all.length)];
    }

    // Shuffle to avoid predictable placement
    for (let i = password.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join("");
}