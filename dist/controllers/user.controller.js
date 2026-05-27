import { login, register, getAllUsers, getUserById } from '../services/user.service.js';
import logger from '../utils/logger.js';
export const loginController = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: '用户名和密码不能为空' });
            return;
        }
        const result = await login(username, password);
        if (!result.success) {
            res.status(401).json({ error: result.error });
            return;
        }
        res.json({
            token: result.token,
            user: result.user
        });
    }
    catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: '登录失败' });
    }
};
export const registerController = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
            return;
        }
        const result = await register(username, email, password);
        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.status(201).json({ id: result.id, username, email });
    }
    catch (error) {
        logger.error('Register error:', error);
        res.status(500).json({ error: '注册失败' });
    }
};
export const getUsersController = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    }
    catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
};
export const getUserByIdController = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: '无效的用户ID' });
            return;
        }
        const user = await getUserById(userId);
        if (!user) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    }
    catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
};
