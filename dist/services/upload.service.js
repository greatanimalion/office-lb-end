import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStoragePath, ensureDirectoryExists } from '../utils/file';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const saveChunk = async (chunk, chunkInfo) => {
    const tempDir = path.join(getStoragePath(), 'temp', chunkInfo.fileId);
    ensureDirectoryExists(tempDir);
    const chunkPath = path.join(tempDir, `chunk_${chunkInfo.chunkIndex}`);
    fs.writeFileSync(chunkPath, chunk);
    return chunkPath;
};
export const mergeChunks = async (chunkInfo, destinationPath) => {
    const tempDir = path.join(getStoragePath(), 'temp', chunkInfo.fileId);
    const writeStream = fs.createWriteStream(destinationPath);
    for (let i = 0; i < chunkInfo.totalChunks; i++) {
        const chunkPath = path.join(tempDir, `chunk_${i}`);
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
    }
    writeStream.end();
    fs.rmSync(tempDir, { recursive: true });
};
export const getUploadProgress = (fileId) => {
    const tempDir = path.join(getStoragePath(), 'temp', fileId);
    if (!fs.existsSync(tempDir)) {
        return 0;
    }
    const files = fs.readdirSync(tempDir);
    return files.length;
};
export const cleanTempUploads = () => {
    const tempDir = path.join(getStoragePath(), 'temp');
    if (!fs.existsSync(tempDir)) {
        return;
    }
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    const dirs = fs.readdirSync(tempDir);
    for (const dir of dirs) {
        const dirPath = path.join(tempDir, dir);
        const stats = fs.statSync(dirPath);
        if (now - stats.mtimeMs > maxAge) {
            fs.rmSync(dirPath, { recursive: true });
        }
    }
};
