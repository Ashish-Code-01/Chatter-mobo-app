// middleware to check authentication
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
    const token = req.headers.token || req.body.token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();

    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};