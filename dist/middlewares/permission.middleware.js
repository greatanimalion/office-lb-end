import { getDocumentById } from '../services/document.service';
export const checkDocumentPermission = (requiredPermission) => {
    return async (req, res, next) => {
        const documentId = parseInt(req.params.id || req.params.documentId, 10);
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: '未授权访问' });
            return;
        }
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const document = await getDocumentById(documentId, userId);
        if (!document) {
            res.status(404).json({ error: '文档不存在或无权访问' });
            return;
        }
        const hasAccess = document.owner_id === userId;
        if (!hasAccess) {
            res.status(403).json({ error: '没有访问权限' });
            return;
        }
        next();
    };
};
export const checkOwnership = async (req, res, next) => {
    const documentId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: '未授权访问' });
        return;
    }
    const document = await getDocumentById(documentId, userId);
    if (!document || document.owner_id !== userId) {
        res.status(403).json({ error: '只有文档所有者可以执行此操作' });
        return;
    }
    next();
};
