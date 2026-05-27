import { generateEditorConfig, handleCallback } from '../services/onlyoffice.service.js';
import { getDocumentById } from '../services/document.service.js';
import logger from '../utils/logger.js';
export const getEditorConfigController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.documentId, 10);
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const document = await getDocumentById(documentId, userId);
        if (!document) {
            res.status(404).json({ error: '文档不存在或无权访问' });
            return;
        }
        const config = generateEditorConfig(document.id, document.title, `http://localhost:5000/api/documents/${document.id}/download`, document.filename.split('.').pop() || 'docx', `http://localhost:5000/api/onlyoffice/${document.id}/callback`, true);
        res.json(config);
    }
    catch (error) {
        logger.error('Get editor config error:', error);
        res.status(500).json({ error: '获取编辑器配置失败' });
    }
};
export const callbackController = async (req, res) => {
    try {
        await handleCallback(req.body);
        res.json({ success: true });
    }
    catch (error) {
        logger.error('OnlyOffice callback error:', error);
        res.status(500).json({ error: '回调处理失败' });
    }
};
