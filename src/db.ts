import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureDirectoryExists } from './utils/file.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let db: Database | null = null
const DB_PATH = process.env.DB_DATABASE || path.join(__dirname, '../database.sqlite')

const addColumnIfNotExists = (db: Database, tableName: string, columnName: string, columnDef: string): void => {
  try {
    const result = db.exec(`PRAGMA table_info(${tableName})`)
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].values.map((row: unknown[]) => row[1] as string)
      if (!columns.includes(columnName)) {
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
      }
    }
  } catch (error) {
    console.warn(`Failed to add column ${columnName} to ${tableName}:`, error)
  }
}

export const initDB = async (): Promise<void> => {
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
    addColumnIfNotExists(db, 'users', 'group_id', 'INTEGER')

  } else {
    db = new SQL.Database()
db.run(`CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_id INTEGER,
        share_type TEXT NOT NULL,
        permission TEXT,
        created_at TEXT,
        updated_at TEXT)`)
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        group_id INTEGER,
        provider TEXT,
        provider_id TEXT
      )
    `)

    db.run(`
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        locked INTEGER DEFAULT 0,
        filesize INTEGER NOT NULL,
        locked_by INTEGER,
        version_number INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `)

    db.run(`
      CREATE TABLE document_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        filesize INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        filepath TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `)

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
    `)

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
    `)

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
    `)

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
    `)

    db.run(`
      CREATE TABLE verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        target TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        created_at TEXT,
        description TEXT)
         `)
    db.run(`
        CREATE TABLE IF NOT EXISTS group_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          created_at TEXT,
          FOREIGN KEY (group_id) REFERENCES groups(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE (group_id, user_id)
        )
      `)
    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        parent_folder_id INTEGER,
        group_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_folder_id) REFERENCES folders(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `)
    saveDB()
  }
}

export const getDB = (): Database | null => {
  return db
}

export const saveDB = (): void => {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)

    ensureDirectoryExists(path.dirname(DB_PATH))

    fs.writeFileSync(DB_PATH, buffer)
  }
}

export const closeDB = (): void => {
  if (db) {
    saveDB()
    db.close()
    db = null
  }
}