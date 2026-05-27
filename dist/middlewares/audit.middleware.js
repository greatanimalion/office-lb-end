import { logAction } from '../services/audit.service.js';
import { AuditEntityType } from '../constants/audit.js';
export const auditAction = (action, entityType = AuditEntityType.DOCUMENT) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                const entityId = req.params.id ? parseInt(req.params.id, 10) : undefined;
                logAction(req.user.id, action, entityType, entityId, `${action}: ${req.method} ${req.path}`).catch((err) => {
                    console.error('Audit log error:', err);
                });
            }
            return originalJson(body);
        };
        next();
    };
};
