import fs from 'fs'
import { getDB, saveDB } from '../db'
import { type Document as _Document, DocumentVersion, OwnerType } from '../models/document.js'
import logger from '../utils/logger'

type Document = Partial<_Document> & Partial<DocumentVersion>
type DocumentVersionWithCreatedAt = Partial<DocumentVersion> & { created_at: string, version_number: number, filesize: number, alter_by_username: string }
export const getDocumentVersion = async (documentId: number): Promise<DocumentVersionWithCreatedAt[]> => {
  const db = getDB()
  if (!db) {
    return []
  }
  const result = db.exec(`SELECT dv.id, dv.document_id, dv.fileSize, dv.v_number, dv.created_at, u.username as alter_by_username
     FROM document_versions dv JOIN users u ON dv.alter_by = u.id WHERE dv.document_id=${documentId}`)
  const versions: DocumentVersionWithCreatedAt[] = []
  if (result.length && result[0].values.length) {
    try {
      result[0].values.forEach((row: unknown[]) => {
        versions.push({
          id: row[0] as number,
          document_id: row[1] as number,
          filesize: row[2] as number,
          version_number: row[3] as number,
          created_at: row[4] as string,
          alter_by_username: row[5] as string,
        })
      })
    } catch (error) {
      logger.error('Error parsing document version:', error)
      return []
    }
  }
  return versions
}

export const getMaxVersionNumber = async (documentId: number): Promise<number> => {
  const db = getDB()
  if (!db) {
    return 0
  }
  const result = db.exec(`SELECT MAX(v_number) FROM document_versions WHERE document_id=${documentId}`)
  if (result.length && result[0].values.length) {
    return Number(result[0].values[0][0] as string) || 0
  }
  return 0
}

type OmitDocument=Omit<Document, 'owner_type'>
export const getAllDocuments =  (page: number, pageSize: number = 100, ownerId: number, owner_type: OwnerType): {documents: OmitDocument[], total: number} => {
  const offset = (page - 1) * pageSize
  const db = getDB()
  if (!db) { return {documents: [], total: 0} }
  const result = db.exec(`SELECT 
    d.id, d.document_v_id, d.title, dv.fileSize, d.status, d.locked, d.locked_by, dv.created_at, d.updated_at, dv.v_number
    FROM documents d JOIN document_versions dv ON d.document_v_id = dv.id 
    WHERE d.owner_id=${ownerId} AND d.owner_type="${owner_type}" LIMIT ${pageSize} OFFSET ${offset}`)
  const documents: OmitDocument[] = []
  const total=db.exec(`SELECT COUNT(*) FROM documents d JOIN document_versions dv ON d.document_v_id = dv.id 
    WHERE d.owner_id=${ownerId} AND d.owner_type="${owner_type}"`)
  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      documents.push({
        id: row[0] as number,
        document_v_id: row[1] as number,
        title: row[2] as string,
        fileSize: row[3] as number,
        status: row[4] as number,
        version_number: row[9] as number,
        locked: row[5] as number,
        locked_by: row[6] as number | undefined,
        created_at: row[7] as string,
        updated_at: row[8] as string
      })
    })
  }
  return {documents: documents, total: Number(total[0].values[0][0] as string) || 0}
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

  const documents: Omit<Document, 'owner_type'>[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      documents.push({
        id: row[0] as number,
        title: row[1] as string,
        filepath: row[3] as string,
        fileSize: row[4] as number,
        owner_id: row[4] as number,
        status: Number(row[5] as string),
        locked: row[6] as number,
        locked_by: row[7] as number | undefined,
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
        filepath: row[3] as string,
        fileSize: row[4] as number,
        owner_id: row[5] as number,
        status: Number(row[5] as string),
        locked: row[6] as number,
        locked_by: row[7] as number | undefined,
        created_at: row[8] as string,
        updated_at: row[9] as string
      })
    })
  }

  return documents
}

export const getDocumentById = async (id: number): Promise<Document | null> => {
  const db = getDB()
  if (!db) {
    return null
  }
  const result = db.exec(`
    SELECT d.id, d.title, d.locked, d.locked_by, d.status, d.updated_at, dv.filepath, dv.filesize, dv.v_number, dv.alter_by, dv.created_at
    FROM documents d JOIN document_versions dv ON d.document_v_id = dv.id
    WHERE d.id=${id} 
  `)
  if (!result.length || !result[0].values.length) {
    return null
  }
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    title: row[1] as string,
    locked: row[2] as number,
    locked_by: row[3] as number | undefined,
    status: row[4] as number,
    updated_at: row[5] as string,
    filepath: row[6] as string,
    fileSize: row[7] as number,
    v_number: row[8] as number,
    alter_by: row[9] as number,
    created_at: row[10] as string,

  }
}
export const createDocument = async (
  ownerId: number,
  owner_type: OwnerType,
  title: string
): Promise<number> => {
  const db = getDB()
  if (!db) { throw new Error('数据库未初始化') }
  db.run(
    `INSERT INTO documents (  owner_id, owner_type,title) VALUES 
    (${ownerId}, "${owner_type}","${title}")`
  )
  const lastIdResult = db.exec('SELECT last_insert_rowid()')
  const lastId = lastIdResult[0].values[0][0] as number
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${ownerId}, ${lastId}, "创建文档")`)
  saveDB()
  return lastId
}
export const DocumentRelateDV = (d_id: number, d_v_id: number) => {
  const db = getDB()
  if (!db) {
    return logger.error('数据库未初始化')
  }
  db.run(`UPDATE documents SET document_v_id = ${d_v_id} WHERE id = ${d_id}`)
  saveDB()
}
export const createDocumentVersion = async (userId: number, documentId: number, filepath: string,
  filesize: number = 0, V: number = 1,
): Promise<number> => {
  const db = getDB()
  if (!db) {
    throw new Error('数据库未初始化')
  }

  db.run(`
    INSERT INTO document_versions (document_id, v_number, filepath, alter_by, filesize)
    VALUES (${documentId}, ${V}, "${filepath}", ${userId}, ${filesize})
  `)
  const lastIdResult = db.exec('SELECT last_insert_rowid()')
  const lastId = lastIdResult[0].values[0][0] as number
  db.run(`INSERT INTO audit_logs (user_id, document_id, action) VALUES (${userId}, ${documentId}, "创建版本 ${V}")`)
  saveDB()
  return lastId
}

export const restoreDocumentVersion = async (documentId: number, versionNumber: number, userId: number): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }
  db.run(`UPDATE documents SET document_v_id = ${versionNumber} WHERE id = ${documentId}`)
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

  const versions = await getDocumentVersion(id)
  // versions.forEach(version => {
  //   if (fs.existsSync(version.filepath)) {
  //     fs.unlinkSync(version.filepath)
  //   }
  // })

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
    // await createDocumentVersion(id, filepath, userId)
  }

  db.run(`UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`)
  saveDB()
}