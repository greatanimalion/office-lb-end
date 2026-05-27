import fs from 'fs';
import path from 'path';
import { getDB, saveDB } from '../db';
import { getStoragePath } from '../utils/file';
import logger from '../utils/logger';
export const initUploadSession = async (filename, filesize, totalChunks, hash) => {
    const db = getDB();
    if (!db) {
        throw new Error('数据库未初始化');
    }
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.run(`
    INSERT INTO upload_sessions (file_id, filename, filesize, total_chunks, uploaded_chunks, hash, created_at, updated_at)
    VALUES ("${fileId}", "${filename}", ${filesize}, ${totalChunks}, "[]", "${hash || ''}", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
    saveDB();
    const tempDir = getStoragePath('temp');
    const chunkDir = path.join(tempDir, fileId);
    fs.mkdirSync(chunkDir, { recursive: true });
    return fileId;
};
export const uploadChunk = async (fileId, chunkIndex, chunkData) => {
    const db = getDB();
    if (!db) {
        throw new Error('数据库未初始化');
    }
    const result = db.exec(`SELECT * FROM upload_sessions WHERE file_id = "${fileId}"`);
    if (!result.length || !result[0].values.length) {
        return { success: false, uploadedChunks: [], isComplete: false, fileId, message: '上传会话不存在' };
    }
    const row = result[0].values[0];
    const totalChunks = row[3];
    const uploadedChunks = JSON.parse(row[4] || '[]');
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
        return { success: false, uploadedChunks, isComplete: false, fileId, message: '无效的分片索引' };
    }
    if (uploadedChunks.includes(chunkIndex)) {
        return { success: true, uploadedChunks, isComplete: uploadedChunks.length === totalChunks, fileId };
    }
    const tempDir = getStoragePath('temp');
    const chunkDir = path.join(tempDir, fileId);
    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
    try {
        fs.writeFileSync(chunkPath, chunkData);
    }
    catch (error) {
        logger.error('Failed to write chunk:', error);
        return { success: false, uploadedChunks, isComplete: false, fileId, message: '写入分片失败' };
    }
    uploadedChunks.push(chunkIndex);
    uploadedChunks.sort((a, b) => a - b);
    db.run(`
    UPDATE upload_sessions 
    SET uploaded_chunks = "${JSON.stringify(uploadedChunks)}", updated_at = CURRENT_TIMESTAMP
    WHERE file_id = "${fileId}"
  `);
    saveDB();
    const isComplete = uploadedChunks.length === totalChunks;
    return { success: true, uploadedChunks, isComplete, fileId };
};
export const verifyChunkIntegrity = async (fileId, chunkIndex, expectedHash) => {
    const tempDir = getStoragePath('temp');
    const chunkPath = path.join(tempDir, fileId, `chunk_${chunkIndex}`);
    if (!fs.existsSync(chunkPath)) {
        return false;
    }
    const chunkData = fs.readFileSync(chunkPath);
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5').update(chunkData).digest('hex');
    return hash === expectedHash;
};
export const mergeChunks = async (fileId) => {
    const db = getDB();
    if (!db) {
        return null;
    }
    const result = db.exec(`SELECT * FROM upload_sessions WHERE file_id = "${fileId}"`);
    if (!result.length || !result[0].values.length) {
        return null;
    }
    const row = result[0].values[0];
    const filename = row[1];
    const totalChunks = row[3];
    const uploadedChunks = JSON.parse(row[4] || '[]');
    const expectedHash = row[5];
    if (uploadedChunks.length !== totalChunks) {
        return null;
    }
    const tempDir = getStoragePath('temp');
    const chunkDir = path.join(tempDir, fileId);
    const documentsDir = getStoragePath('documents');
    const newFilename = `${Date.now()}_${filename}`;
    const outputPath = path.join(documentsDir, newFilename);
    try {
        const writeStream = fs.createWriteStream(outputPath);
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(chunkDir, `chunk_${i}`);
            if (!fs.existsSync(chunkPath)) {
                writeStream.close();
                fs.unlinkSync(outputPath);
                return null;
            }
            const chunkData = fs.readFileSync(chunkPath);
            writeStream.write(chunkData);
            fs.unlinkSync(chunkPath);
        }
        writeStream.close();
        fs.rmdirSync(chunkDir);
        if (expectedHash) {
            const crypto = await import('crypto');
            const fileData = fs.readFileSync(outputPath);
            const actualHash = crypto.createHash('md5').update(fileData).digest('hex');
            if (actualHash !== expectedHash) {
                fs.unlinkSync(outputPath);
                return null;
            }
        }
        db.run(`DELETE FROM upload_sessions WHERE file_id = "${fileId}"`);
        saveDB();
        return outputPath;
    }
    catch (error) {
        logger.error('Merge chunks error:', error);
        return null;
    }
};
export const getUploadSession = async (fileId) => {
    const db = getDB();
    if (!db) {
        return null;
    }
    const result = db.exec(`SELECT * FROM upload_sessions WHERE file_id = "${fileId}"`);
    if (!result.length || !result[0].values.length) {
        return null;
    }
    const row = result[0].values[0];
    return {
        fileId: row[0],
        filename: row[1],
        filesize: row[2],
        totalChunks: row[3],
        uploadedChunks: JSON.parse(row[4] || '[]'),
        hash: row[5] || undefined,
        createdAt: new Date(row[6]),
        updatedAt: new Date(row[7] || row[6])
    };
};
export const getUploadProgress = async (fileId) => {
    const session = await getUploadSession(fileId);
    if (!session) {
        return null;
    }
    return {
        progress: Math.round((session.uploadedChunks.length / session.totalChunks) * 100),
        uploadedChunks: session.uploadedChunks
    };
};
export const cancelUploadSession = async (fileId) => {
    const db = getDB();
    if (!db) {
        return false;
    }
    const result = db.exec(`SELECT file_id FROM upload_sessions WHERE file_id = "${fileId}"`);
    if (!result.length || !result[0].values.length) {
        return false;
    }
    const chunkDir = path.join(getStoragePath('temp'), fileId);
    if (fs.existsSync(chunkDir)) {
        fs.rmSync(chunkDir, { recursive: true });
    }
    db.run(`DELETE FROM upload_sessions WHERE file_id = "${fileId}"`);
    saveDB();
    return true;
};
export const cleanupExpiredSessions = async (hours = 24) => {
    const db = getDB();
    if (!db) {
        return;
    }
    const result = db.exec(`SELECT file_id FROM upload_sessions WHERE updated_at < datetime('now', '-${hours} hours')`);
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            const fileId = row[0];
            const chunkDir = path.join(getStoragePath('temp'), fileId);
            if (fs.existsSync(chunkDir)) {
                fs.rmSync(chunkDir, { recursive: true });
            }
        });
    }
    db.run(`DELETE FROM upload_sessions WHERE updated_at < datetime('now', '-${hours} hours')`);
    saveDB();
};
export const listUploadSessions = async (userId) => {
    const db = getDB();
    if (!db) {
        return [];
    }
    let query = 'SELECT * FROM upload_sessions ORDER BY created_at DESC';
    const result = db.exec(query);
    if (!result.length || !result[0].values.length) {
        return [];
    }
    return result[0].values.map((row) => ({
        fileId: row[0],
        filename: row[1],
        filesize: row[2],
        totalChunks: row[3],
        uploadedChunks: JSON.parse(row[4] || '[]'),
        hash: row[5] || undefined,
        createdAt: new Date(row[6]),
        updatedAt: new Date(row[7] || row[6])
    }));
};
