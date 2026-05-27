import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirectoryExists } from './utils/file.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db = null;
const DB_PATH = process.env.DB_DATABASE || path.join(__dirname, '../database.sqlite');
const addColumnIfNotExists = (db, tableName, columnName, columnDef) => {
    try {
        const result = db.exec(`PRAGMA table_info(${tableName})`);
        if (result.length > 0 && result[0].values.length > 0) {
            const columns = result[0].values.map((row) => row[1]);
            if (!columns.includes(columnName)) {
                db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
            }
        }
    }
    catch (error) {
        console.warn(`Failed to add column ${columnName} to ${tableName}:`, error);
    }
};
export const initDB = async () => {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        addColumnIfNotExists(db, 'users', 'provider', 'TEXT');
        addColumnIfNotExists(db, 'users', 'provider_id', 'TEXT');
        addColumnIfNotExists(db, 'documents', 'status', "TEXT DEFAULT 'active'");
        addColumnIfNotExists(db, 'documents', 'locked', 'INTEGER DEFAULT 0');
        addColumnIfNotExists(db, 'documents', 'locked_by', 'INTEGER');
        addColumnIfNotExists(db, 'upload_sessions', 'hash', 'TEXT');
    }
    else {
        db = new SQL.Database();
        db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        provider TEXT,
        provider_id TEXT
      )
    `);
        db.run(`
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        locked INTEGER DEFAULT 0,
        locked_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
        db.run(`
      CREATE TABLE document_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        filepath TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
        db.run(`
      CREATE TABLE document_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        permission TEXT NOT NULL,
        shared_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
        db.run(`
      CREATE TABLE share_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        password TEXT,
        expires_at DATETIME,
        max_views INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        permissions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )
    `);
        db.run(`
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        document_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )
    `);
        db.run(`
      CREATE TABLE upload_sessions (
        file_id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        uploaded_chunks TEXT NOT NULL,
        hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        saveDB();
    }
};
export const getDB = () => {
    return db;
};
export const saveDB = () => {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        ensureDirectoryExists(path.dirname(DB_PATH));
        fs.writeFileSync(DB_PATH, buffer);
    }
};
export const closeDB = () => {
    if (db) {
        saveDB();
        db.close();
        db = null;
    }
};
