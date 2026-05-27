import { verifyToken } from '../services/jwt.service';
import { getUserById } from '../services/user.service';
import logger from '../utils/logger.js';
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: '访问令牌缺失' });
        return;
    }
    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(403).json({ error: '无效的访问令牌' });
            return;
        }
        const user = await getUserById(decoded.userId);
        if (!user) {
            res.status(403).json({ error: '用户不存在' });
            return;
        }
        req.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        next();
    }
    catch (error) {
        logger.error('Token verification failed:', error);
        res.status(403).json({ error: '无效的访问令牌' });
    }
};
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        next();
        return;
    }
    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(403).json({ error: '无效的访问令牌' });
            return;
        }
        const user = await getUserById(decoded.userId);
        if (user) {
            req.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };
        }
    }
    catch (error) {
        logger.warn('Optional auth token verification failed:', error);
    }
    next();
};
