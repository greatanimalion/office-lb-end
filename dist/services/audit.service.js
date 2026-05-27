import { getDB } from '../db';
import { AuditEntityType } from '../constants/audit';
export const logAction = async (userId, action, entityType, entityId, details) => {
    const db = getDB();
    if (!db) {
        return;
    }
    const documentId = entityType === AuditEntityType.DOCUMENT ? entityId : null;
    db.run(`INSERT INTO audit_logs (user_id, document_id, action, entity_type, details) VALUES (${userId}, ${documentId || 'NULL'}, "${action}", "${entityType}", "${details || ''}")`);
};
export const getAuditLogs = async (options = {}) => {
    const db = getDB();
    if (!db) {
        return [];
    }
    const { userId, documentId, action, startDate, endDate, limit = 100, offset = 0 } = options;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    if (userId) {
        query += ` AND user_id = ${userId}`;
    }
    if (documentId) {
        query += ` AND document_id = ${documentId}`;
    }
    if (action) {
        query += ` AND action = "${action}"`;
    }
    if (startDate) {
        query += ` AND created_at >= "${startDate}"`;
    }
    if (endDate) {
        query += ` AND created_at <= "${endDate}"`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const result = db.exec(query);
    const logs = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            logs.push({
                id: row[0],
                userId: row[1],
                documentId: row[2],
                action: row[3],
                entityType: row[4],
                details: row[5],
                ipAddress: row[6],
                userAgent: row[7],
                createdAt: row[8]
            });
        });
    }
    return logs;
};
