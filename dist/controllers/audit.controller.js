import { getAuditLogs } from '../services/audit.service.js';
import logger from '../utils/logger.js';
export const getAuditLogsController = async (req, res) => {
    try {
        const { userId, documentId, action, startDate, endDate, limit, offset } = req.query;
        const userIdNum = userId ? parseInt(userId, 10) : undefined;
        const documentIdNum = documentId ? parseInt(documentId, 10) : undefined;
        const actionEnum = action;
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        const offsetNum = offset ? parseInt(offset, 10) : undefined;
        const logs = await getAuditLogs({
            userId: userIdNum,
            documentId: documentIdNum,
            action: actionEnum,
            startDate: startDate,
            endDate: endDate,
            limit: limitNum,
            offset: offsetNum
        });
        res.json(logs);
    }
    catch (error) {
        logger.error('Get audit logs error:', error);
        res.status(500).json({ error: '获取审计日志失败' });
    }
};
