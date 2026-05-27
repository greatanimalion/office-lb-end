import path from 'path';
import { fileURLToPath } from 'url';
import { getDocumentsByOwner, getSharedDocuments, getDocumentById, createDocument, updateDocument, deleteDocument, shareDocument, unshareDocument, trackDocumentUpdate } from '../services/document.service.js';
import { getStoragePath } from '../utils/file.js';
import logger from '../utils/logger.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const getDocumentsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const documents = await getDocumentsByOwner(userId);
        res.json(documents);
    }
    catch (error) {
        logger.error('Get documents error:', error);
        res.status(500).json({ error: '获取文档列表失败' });
    }
};
export const getSharedDocumentsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const documents = await getSharedDocuments(userId);
        res.json(documents);
    }
    catch (error) {
        logger.error('Get shared documents error:', error);
        res.status(500).json({ error: '获取共享文档列表失败' });
    }
};
export const getDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const document = await getDocumentById(documentId, userId);
        if (!document) {
            res.status(404).json({ error: '文档不存在或无权访问' });
            return;
        }
        res.json(document);
    }
    catch (error) {
        logger.error('Get document error:', error);
        res.status(500).json({ error: '获取文档信息失败' });
    }
};
export const createDocumentController = async (req, res) => {
    try {
        const { title } = req.body;
        const file = req.file;
        const userId = req.user.id;
        if (!file) {
            res.status(400).json({ error: '请上传文件' });
            return;
        }
        const newFilename = `${Date.now()}_${file.originalname}`;
        const documentsDir = path.join(getStoragePath(), 'documents');
        const newPath = path.join(documentsDir, newFilename);
        const documentId = await createDocument(title || file.originalname, newFilename, newPath, userId);
        res.status(201).json({ id: documentId, title: title || file.originalname });
    }
    catch (error) {
        logger.error('Create document error:', error);
        res.status(500).json({ error: '创建文档失败' });
    }
};
export const updateDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const { title } = req.body;
        const userId = req.user.id;
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const success = await updateDocument(documentId, title, userId);
        if (!success) {
            res.status(403).json({ error: '无权修改此文档' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        logger.error('Update document error:', error);
        res.status(500).json({ error: '更新文档失败' });
    }
};
export const deleteDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const success = await deleteDocument(documentId, userId);
        if (!success) {
            res.status(403).json({ error: '无权删除此文档' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        logger.error('Delete document error:', error);
        res.status(500).json({ error: '删除文档失败' });
    }
};
export const shareDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const { userId, permission } = req.body;
        const currentUserId = req.user.id;
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const success = await shareDocument(documentId, userId, permission, currentUserId);
        if (!success) {
            res.status(403).json({ error: '无权分享此文档' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        logger.error('Share document error:', error);
        res.status(500).json({ error: '分享文档失败' });
    }
};
export const unshareDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const targetUserId = parseInt(req.params.userId, 10);
        const currentUserId = req.user.id;
        if (isNaN(documentId) || isNaN(targetUserId)) {
            res.status(400).json({ error: '无效的参数' });
            return;
        }
        const success = await unshareDocument(documentId, targetUserId, currentUserId);
        if (!success) {
            res.status(403).json({ error: '无权取消分享' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        logger.error('Unshare document error:', error);
        res.status(500).json({ error: '取消分享失败' });
    }
};
export const downloadDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        const document = await getDocumentById(documentId, userId);
        if (!document) {
            res.status(404).json({ error: '文档不存在或无权访问' });
            return;
        }
        res.download(document.filepath, document.filename);
    }
    catch (error) {
        logger.error('Download document error:', error);
        res.status(500).json({ error: '下载文档失败' });
    }
};
export const trackDocumentController = async (req, res) => {
    try {
        const documentId = parseInt(req.params.id, 10);
        if (isNaN(documentId)) {
            res.status(400).json({ error: '无效的文档ID' });
            return;
        }
        await trackDocumentUpdate(documentId);
        res.json({ success: true });
    }
    catch (error) {
        logger.error('Track document error:', error);
        res.status(500).json({ error: '更新文档跟踪失败' });
    }
};
