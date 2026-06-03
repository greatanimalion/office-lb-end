import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDB, saveDB } from '../db'
import { getStoragePath } from '../utils/file'
import {Document,DocumentVersion} from '../models/document.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)





export const getAllDocuments=async (page:number,pageSize:number=10,userId:number)=>{
  const offset=(page-1)*pageSize
  const db = getDB()
  if (!db) {
    return []
  }
  const result = db.exec(`SELECT * FROM documents d WHERE d.owner_id=${userId}  LIMIT ${pageSize} OFFSET ${offset}`)
  const documents: Document[] = []
  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      documents.push({
        id: row[0] as number,
        title: row[1] as string,
        filename: row[2] as string,
        filepath: row[3] as string,
        owner_id: row[4] as number,
        status: row[5] as string,
        locked: (row[6] as number) === 1,
        fileSize: row[7] as number,
        locked_by: row[8] as number | undefined,
        version_number: row[9] as number,
        created_at: row[10] as string,
        updated_at: row[11] as string
      })
    })
  }
  return documents
}

export const getDocumentsByOwner = async (ownerId: number): Promise<Document[]> => {
  const db = getDB()

  if (!db) {
    return []
  }

  const result = db.exec(`
    SELECT d.id, d.title, d.filename, d.filepath, d.filesize, d.owner_id_id, d.status, d.locked, d.locked_by, d.created_at, d.updated_at
    FROM documents d
    WHERE d.owner_id = ${ownerId} AND d.status != 'deleted'
    ORDER BY d.updated_at DESC
  `)

  const documents: Document[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      documents.push({
        id: row[0] as number,
        title: row[1] as string,
        filename: row[2] as string,
        filepath: row[3] as string,
        fileSize: row[4] as number,
        owner_id: row[4] as number,
        status: row[5] as string,
        locked: (row[6] as number) === 1,
        locked_by: row[7] as number | undefined,
        version_number: row[8] as number,
        created_at: row[8] as string,
        updated_at: row[9] as string
      })
    })
  }
  return documents
}

export const getSharedDocuments = async (userId: number): Promise<Document[]> => {
  const db = getDB()

  if (!db) {
    return []
  }

  const result = db.exec(`
    SELECT d.id, d.title, d.filename, d.filepath, d.filesize, d.owner_id_id_id, d.owner_id_id, d.status, d.locked, d.locked_by, d.created_at, d.updated_at, ds.permission
    FROM documents d
    JOIN document_shares ds ON d.id = ds.document_id
    WHERE ds.user_id = ${userId} AND d.status != 'deleted'
    ORDER BY d.updated_at DESC
  `)

  const documents: Document[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      documents.push({
        id: row[0] as number,
        title: row[1] as string,
        filename: row[2] as string,
        filepath: row[3] as string,
        fileSize: row[4] as number,
        owner_id: row[5] as number,
        status: row[5] as string,
        locked: (row[6] as number) === 1,
        locked_by: row[7] as number | undefined,
        version_number: row[8] as number,
        created_at: row[8] as string,
        updated_at: row[9] as string
      })
    })
  }

  return documents
}

export const getDocumentById = async (id: number, userId: number): Promise<Document | null> => {
  const db = getDB()
  if (!db) {
    return null
  }
  const result = db.exec(`
    SELECT DISTINCT d.id, d.title, d.filename, d.filepath, d.filesize, d.owner_id, d.status, d.locked, d.locked_by, d.created_at, d.updated_at
    FROM documents d where d.id=${id} 
  `)

  if (!result.length || !result[0].values.length) {
    return null
  }
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    title: row[1] as string,
    filename: row[2] as string,
    filepath: row[3] as string,
    fileSize: row[4] as number,
    owner_id: row[5] as number,
    status: row[5] as string,
    locked: (row[6] as number) === 1,
    locked_by: row[7] as number | undefined,
    version_number: row[8] as number,
    created_at: row[8] as string,
    updated_at: row[9] as string
  }
}
export const createDocument = async (
  title: string,
  filename: string,
  filepath: string,
  ownerId: number,
  filesize: number=0
): Promise<number> => {
  const db = getDB()
  if (!db) { throw new Error('数据库未初始化')}
  console.log(title, filename, filepath, ownerId, filesize)
  db.run(
    `INSERT INTO documents (title, filename, filepath, owner_id, status, filesize) VALUES ("${title}", "${filename}", "${filepath}", ${ownerId}, "active", ${filesize})`
  )
  const lastIdResult = db.exec('SELECT last_insert_rowid()')
  const lastId = lastIdResult[0].values[0][0] as number
  await createDocumentVersion(lastId, filepath, ownerId, filesize)
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${ownerId}, ${lastId}, "创建文档")`)
  saveDB()
  return lastId
}

export const createDocumentVersion = async (documentId: number, filepath: string, userId: number, filesize: number=0): Promise<void> => {
  const db = getDB()
  if (!db) {
    return
  }
  const versionResult = db.exec(`SELECT MAX(version_number) FROM document_versions WHERE document_id = ${documentId}`)
  const currentVersion = versionResult[0].values[0][0] as number || 0
  const newVersion = currentVersion + 1

  const versionsDir = getStoragePath('versions')
  const versionFilename = `${documentId}_v${newVersion}_${Date.now()}${path.extname(filepath)}`
  const versionPath = path.join(versionsDir, versionFilename)
  
  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true })
  }
  
  fs.copyFileSync(filepath, versionPath)
  db.run(`
    INSERT INTO document_versions (document_id, version_number, filepath, created_by, filesize)
    VALUES (${documentId}, ${newVersion}, "${versionPath}", ${userId}, ${filesize})
  `)
  saveDB()
}

export const getDocumentVersions = async (documentId: number): Promise<DocumentVersion[]> => {
  const db = getDB()

  if (!db) {
    return []
  }

  const result = db.exec(`
    SELECT id, document_id, version_number, filepath, created_at, created_by
    FROM document_versions
    WHERE document_id = ${documentId}
    ORDER BY version_number DESC
  `)

  const versions: DocumentVersion[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      versions.push({
        id: row[0] as number,
        document_id: row[1] as number,
        version_number: row[2] as number,
        filesize: row[3] as number,
        filepath: row[3] as string,
        created_by: row[4] as number,
        created_at: row[5] as Date
      })
    })
  }

  return versions
}

export const restoreDocumentVersion = async (documentId: number, versionNumber: number, userId: number): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const versionResult = db.exec(`
    SELECT dv.filepath, d.owner_id, d.filepath as current_path
    FROM document_versions dv
    JOIN documents d ON dv.document_id = d.id
    WHERE dv.document_id = ${documentId} AND dv.version_number = ${versionNumber}
  `)

  if (!versionResult.length || !versionResult[0].values.length) {
    return false
  }

  const row = versionResult[0].values[0]
  const versionPath = row[0] as string
  const ownerId = row[1] as number
  const currentPath = row[2] as string

  if (ownerId !== userId) {
    return false
  }

  if (!fs.existsSync(versionPath)) {
    return false
  }

  fs.copyFileSync(versionPath, currentPath)

  db.run(`UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ${documentId}`)
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${documentId}, "恢复版本 ${versionNumber}")`)
  saveDB()

  return true
}

export const lockDocument = async (documentId: number, userId: number): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const documentResult = db.exec(`SELECT owner_id, locked FROM documents WHERE id = ${documentId}`)

  if (!documentResult.length || !documentResult[0].values.length) {
    return false
  }

  const row = documentResult[0].values[0]
  const ownerId = row[0] as number
  const isLocked = (row[1] as number) === 1

  if (ownerId !== userId) {
    return false
  }

  if (isLocked) {
    return false
  }

  db.run(`UPDATE documents SET locked = 1, locked_by = ${userId} WHERE id = ${documentId}`)
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${documentId}, "锁定文档")`)
  saveDB()

  return true
}

export const unlockDocument = async (documentId: number, userId: number): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const documentResult = db.exec(`SELECT owner_id, locked_by FROM documents WHERE id = ${documentId}`)

  if (!documentResult.length || !documentResult[0].values.length) {
    return false
  }

  const row = documentResult[0].values[0]
  const ownerId = row[0] as number
  const lockedBy = row[1] as number

  if (ownerId !== userId && lockedBy !== userId) {
    return false
  }

  db.run(`UPDATE documents SET locked = 0, locked_by = NULL WHERE id = ${documentId}`)
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${documentId}, "解锁文档")`)
  saveDB()

  return true
}

export const updateDocument = async (
  id: number,
  title: string,
  userId: number
): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${id}`)

  if (!documentResult.length || !documentResult[0].values.length) {
    return false
  }

  const ownerId = documentResult[0].values[0][0] as number

  if (ownerId !== userId) {
    return false
  }

  db.run(`UPDATE documents SET title = "${title}", updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`)
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${id}, "修改文档信息")`)
  saveDB()

  return true
}

export const deleteDocument = async (id: number, userId: number): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const documentResult = db.exec(`SELECT * FROM documents WHERE id = ${id}`)

  if (!documentResult.length || !documentResult[0].values.length) {
    return false
  }

  const row = documentResult[0].values[0]
  const ownerId = row[4] as number

  if (ownerId !== userId) {
    return false
  }

  const filepath = row[3] as string
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }

  const versions = await getDocumentVersions(id)
  versions.forEach(version => {
    if (fs.existsSync(version.filepath)) {
      fs.unlinkSync(version.filepath)
    }
  })

  db.run(`DELETE FROM document_versions WHERE document_id = ${id}`)
  db.run(`DELETE FROM document_shares WHERE document_id = ${id}`)
  db.run(`DELETE FROM documents WHERE id = ${id}`)
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${id}, "删除文档")`)
  saveDB()

  return true
}

export const shareDocument = async (
  documentId: number,
  targetUserId: number,
  permission: string,
  userId: number
): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${documentId}`)

  if (!documentResult.length || !documentResult[0].values.length) {
    return false
  }

  const ownerId = documentResult[0].values[0][0] as number

  if (ownerId !== userId) {
    return false
  }

  try {
    db.run(`INSERT INTO document_shares (document_id, user_id, permission, shared_by) VALUES (${documentId}, ${targetUserId}, "${permission}", ${userId})`)
    db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${documentId}, "分享文档给用户 ${targetUserId}")`)
    saveDB()
    return true
  } catch (err) {
    return false
  }
}

export const unshareDocument = async (
  documentId: number,
  targetUserId: number,
  userId: number
): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${documentId}`)

  if (!documentResult.length || !documentResult[0].values.length) {
    return false
  }

  const ownerId = documentResult[0].values[0][0] as number

  if (ownerId !== userId) {
    return false
  }

  db.run(`DELETE FROM document_shares WHERE document_id = ${documentId} AND user_id = ${targetUserId}`)
  saveDB()

  return true
}

export const trackDocumentUpdate = async (id: number, userId: number): Promise<void> => {
  const db = getDB()

  if (!db) {
    return
  }

  const documentResult = db.exec(`SELECT filepath FROM documents WHERE id = ${id}`)
  if (documentResult.length > 0 && documentResult[0].values.length > 0) {
    const filepath = documentResult[0].values[0][0] as string
    await createDocumentVersion(id, filepath, userId)
  }

  db.run(`UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`)
  saveDB()
}