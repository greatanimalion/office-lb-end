import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ALLOWED_EXTENSIONS = [
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.pdf', '.txt', '.rtf', '.odt', '.ods', '.odp'
];
export const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};
export const isAllowedFileType = (filename) => {
    const ext = getFileExtension(filename);
    return ALLOWED_EXTENSIONS.includes(ext);
};
export const calculateMD5 = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};
export const getFileSize = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.size;
};
export const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};
export const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};
export const moveFile = (source, destination) => {
    fs.renameSync(source, destination);
};
export const copyFile = (source, destination) => {
    fs.copyFileSync(source, destination);
};
export const mergeChunks = async (chunkPaths, outputPath) => {
    const writeStream = fs.createWriteStream(outputPath);
    for (const chunkPath of chunkPaths) {
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
    }
    writeStream.end();
};
export const getStoragePath = () => {
    return path.join(__dirname, '../../uploads');
};
