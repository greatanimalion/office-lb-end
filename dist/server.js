import dotenv from 'dotenv';
dotenv.config();
import { initDB } from './db.js';
import { startServer } from './app.js';
import logger from './utils/logger.js';
async function main() {
    try {
        await initDB();
        logger.info('Database initialized');
        await startServer();
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
main();
