import bcrypt from 'bcryptjs';
import { getDB, saveDB } from '../db';
import { generateToken } from '../utils/jwt';
import config from '../config/index';
export const login = async (username, password) => {
    const db = getDB();
    if (!db) {
        return { success: false, error: '数据库未初始化' };
    }
    const userResult = db.exec(`SELECT * FROM users WHERE username = "${username}"`);
    if (!userResult.length || !userResult[0].values.length) {
        return { success: false, error: '用户名或密码错误' };
    }
    const row = userResult[0].values[0];
    const user = {
        id: row[0],
        username: row[1],
        email: row[2],
        password: row[3],
        role: row[4]
    };
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
        return { success: false, error: '用户名或密码错误' };
    }
    const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
    });
    return {
        success: true,
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    };
};
export const register = async (username, email, password) => {
    const db = getDB();
    if (!db) {
        return { success: false, error: '数据库未初始化' };
    }
    try {
        const hashedPassword = bcrypt.hashSync(password, config.auth.bcryptSaltRounds);
        db.run(`INSERT INTO users (username, email, password) VALUES ("${username}", "${email}", "${hashedPassword}")`);
        const lastIdResult = db.exec('SELECT last_insert_rowid()');
        const lastId = lastIdResult[0].values[0][0];
        db.run(`INSERT INTO audit_logs (user_id, action) VALUES (${lastId}, "用户注册")`);
        saveDB();
        return { success: true, id: lastId };
    }
    catch (err) {
        return { success: false, error: '用户名或邮箱已存在' };
    }
};
export const createOrGetUser = async (options) => {
    const db = getDB();
    if (!db) {
        throw new Error('数据库未初始化');
    }
    const { username, email, role = 'user', provider, providerId } = options;
    if (provider && providerId) {
        const existingResult = db.exec(`SELECT * FROM users WHERE provider = "${provider}" AND provider_id = "${providerId}"`);
        if (existingResult.length > 0 && existingResult[0].values.length > 0) {
            const row = existingResult[0].values[0];
            return {
                id: row[0],
                username: row[1],
                email: row[2],
                password: row[3],
                role: row[4]
            };
        }
    }
    const randomPassword = bcrypt.hashSync(Math.random().toString(36).substr(2, 11), config.auth.bcryptSaltRounds);
    db.run(`INSERT INTO users (username, email, password, role, provider, provider_id) 
     VALUES ("${username}", "${email}", "${randomPassword}", "${role}", "${provider || ''}", "${providerId || ''}")`);
    const lastIdResult = db.exec('SELECT last_insert_rowid()');
    const lastId = lastIdResult[0].values[0][0];
    saveDB();
    return {
        id: lastId,
        username,
        email,
        password: randomPassword,
        role
    };
};
export const getUserById = async (id) => {
    const db = getDB();
    if (!db) {
        return null;
    }
    const result = db.exec(`SELECT * FROM users WHERE id = ${id}`);
    if (!result.length || !result[0].values.length) {
        return null;
    }
    const row = result[0].values[0];
    return {
        id: row[0],
        username: row[1],
        email: row[2],
        password: row[3],
        role: row[4]
    };
};
export const getAllUsers = async () => {
    const db = getDB();
    if (!db) {
        return [];
    }
    const result = db.exec('SELECT id, username, email FROM users');
    const users = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            users.push({
                id: row[0],
                username: row[1],
                email: row[2],
                password: '',
                role: ''
            });
        });
    }
    return users;
};
