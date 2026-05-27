import dotenv from 'dotenv';
import database from './database';
import redis from './redis';
import onlyoffice from './onlyoffice';
import meilisearch from './meilisearch';
import auth from './auth';
import email from './email';
dotenv.config();
const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database,
    redis,
    onlyoffice,
    meilisearch,
    auth,
    email,
    uploads: {
        temp: process.env.UPLOAD_TEMP_DIR || 'uploads/temp',
        documents: process.env.UPLOAD_DOCUMENTS_DIR || 'uploads/documents',
        versions: process.env.UPLOAD_VERSIONS_DIR || 'uploads/versions',
        previews: process.env.UPLOAD_PREVIEWS_DIR || 'uploads/previews',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
    },
    logs: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || 'logs',
    },
};
export default config;
