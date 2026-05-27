import jwt from 'jsonwebtoken';
import config from '../config/index.js';
export const generateToken = (payload) => {
    return jwt.sign(payload, config.auth.jwtSecret, {
        expiresIn: config.auth.jwtExpiresIn,
    });
};
export const verifyToken = (token) => {
    return jwt.verify(token, config.auth.jwtSecret);
};
export const decodeToken = (token) => {
    const decoded = jwt.decode(token);
    return decoded;
};
