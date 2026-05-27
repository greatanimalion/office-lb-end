import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB, saveDB } from '../db';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const getDocumentsByOwner = async (ownerId) => {
    const db = getDB();
    if (!db) {
        return [];
    }
    const result = db.exec(`
    SELECT d.id, d.title, d.filename, d.filepath, d.owner_id, d.created_at, d.updated_at
    FROM documents d
    WHERE d.owner_id = ${ownerId}
    ORDER BY d.updated_at DESC
  `);
    const documents = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            documents.push({
                id: row[0],
                title: row[1],
                filename: row[2],
                filepath: row[3],
                owner_id: row[4],
                created_at: row[5],
                updated_at: row[6]
            });
        });
    }
    return documents;
};
export const getSharedDocuments = async (userId) => {
    const db = getDB();
    if (!db) {
        return [];
    }
    const result = db.exec(`
    SELECT d.id, d.title, d.filename, d.filepath, d.owner_id, d.created_at, d.updated_at, ds.permission
    FROM documents d
    JOIN document_shares ds ON d.id = ds.document_id
    WHERE ds.user_id = ${userId}
    ORDER BY d.updated_at DESC
  `);
    const documents = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            documents.push({
                id: row[0],
                title: row[1],
                filename: row[2],
                filepath: row[3],
                owner_id: row[4],
                created_at: row[5],
                updated_at: row[6]
            });
        });
    }
    return documents;
};
export const getDocumentById = async (id, userId) => {
    const db = getDB();
    if (!db) {
        return null;
    }
    const result = db.exec(`
    SELECT d.id, d.title, d.filename, d.filepath, d.owner_id, d.created_at, d.updated_at
    FROM documents d
    WHERE d.id = ${id} AND (d.owner_id = ${userId} OR EXISTS (
      SELECT 1 FROM document_shares ds WHERE ds.document_id = d.id AND ds.user_id = ${userId}
    ))
  `);
    if (!result.length || !result[0].values.length) {
        return null;
    }
    const row = result[0].values[0];
    return {
        id: row[0],
        title: row[1],
        filename: row[2],
        filepath: row[3],
        owner_id: row[4],
        created_at: row[5],
        updated_at: row[6]
    };
};
export const createDocument = async (title, filename, filepath, ownerId) => {
    const db = getDB();
    if (!db) {
        throw new Error('数据库未初始化');
    }
    db.run(`INSERT INTO documents (title, filename, filepath, owner_id) VALUES ("${title}", "${filename}", "${filepath}", ${ownerId})`);
    const lastIdResult = db.exec('SELECT last_insert_rowid()');
    const lastId = lastIdResult[0].values[0][0];
    db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${ownerId}, ${lastId}, "创建文档")`);
    saveDB();
    return lastId;
};
export const updateDocument = async (id, title, userId) => {
    const db = getDB();
    if (!db) {
        return false;
    }
    const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${id}`);
    if (!documentResult.length || !documentResult[0].values.length) {
        return false;
    }
    const ownerId = documentResult[0].values[0][0];
    if (ownerId !== userId) {
        return false;
    }
    db.run(`UPDATE documents SET title = "${title}", updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${id}, "修改文档信息")`);
    saveDB();
    return true;
};
export const deleteDocument = async (id, userId) => {
    const db = getDB();
    if (!db) {
        return false;
    }
    const documentResult = db.exec(`SELECT * FROM documents WHERE id = ${id}`);
    if (!documentResult.length || !documentResult[0].values.length) {
        return false;
    }
    const row = documentResult[0].values[0];
    const ownerId = row[4];
    if (ownerId !== userId) {
        return false;
    }
    const filepath = row[3];
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
    }
    db.run(`DELETE FROM document_shares WHERE document_id = ${id}`);
    db.run(`DELETE FROM documents WHERE id = ${id}`);
    db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${id}, "删除文档")`);
    saveDB();
    return true;
};
export const shareDocument = async (documentId, targetUserId, permission, userId) => {
    const db = getDB();
    if (!db) {
        return false;
    }
    const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${documentId}`);
    if (!documentResult.length || !documentResult[0].values.length) {
        return false;
    }
    const ownerId = documentResult[0].values[0][0];
    if (ownerId !== userId) {
        return false;
    }
    try {
        db.run(`INSERT INTO document_shares (document_id, user_id, permission) VALUES (${documentId}, ${targetUserId}, "${permission}")`);
        db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${documentId}, "分享文档给用户 ${targetUserId}")`);
        saveDB();
        return true;
    }
    catch (err) {
        return false;
    }
};
export const unshareDocument = async (documentId, targetUserId, userId) => {
    const db = getDB();
    if (!db) {
        return false;
    }
    const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${documentId}`);
    if (!documentResult.length || !documentResult[0].values.length) {
        return false;
    }
    const ownerId = documentResult[0].values[0][0];
    if (ownerId !== userId) {
        return false;
    }
    db.run(`DELETE FROM document_shares WHERE document_id = ${documentId} AND user_id = ${targetUserId}`);
    saveDB();
    return true;
};
export const trackDocumentUpdate = async (id) => {
    const db = getDB();
    if (!db) {
        return;
    }
    db.run(`UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    saveDB();
};
