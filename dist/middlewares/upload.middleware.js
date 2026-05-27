import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStoragePath, isAllowedFileType } from '../utils/file';
import { MAX_FILE_SIZE } from '../constants/document';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const createUploadMiddleware = (fieldName = 'file') => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(getStoragePath(), 'documents');
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
            const filename = `${uniqueSuffix}_${file.originalname}`;
            cb(null, filename);
        }
    });
    const fileFilter = (req, file, cb) => {
        if (isAllowedFileType(file.originalname)) {
            cb(null, true);
        }
        else {
            cb(new Error('不支持的文件类型'));
        }
    };
    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: MAX_FILE_SIZE
        }
    }).single(fieldName);
};
export const handleUploadError = (err, req, res, next) => {
    if (err.message === 'Unsupported file type') {
        res.status(400).json({ error: '不支持的文件类型' });
        return;
    }
    if (err.message.includes('File too large')) {
        res.status(400).json({ error: '文件大小超过限制' });
        return;
    }
    res.status(500).json({ error: '文件上传失败' });
};
