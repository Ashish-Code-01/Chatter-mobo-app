// middleware to check authentication
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
    // Extract token from Authorization header only (not from body for security)
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : req.headers.token;

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Validate JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};