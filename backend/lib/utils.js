import jwt from 'jsonwebtoken';

export function generateToken(userId) {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
    return token;
}