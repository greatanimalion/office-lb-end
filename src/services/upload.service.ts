import fs from 'fs'
import path from 'path'
import { getDB, saveDB } from '../db'
import { getStoragePath } from '../utils/file'
import logger from '../utils/logger'

export interface ChunkUploadInfo {
  fileId: string
  chunkIndex: number
  totalChunks: number
  filename: string
  filesize: number
  hash?: string
}

export interface UploadSession {
  fileId: string
  filename: string
  filesize: number
  totalChunks: number
  uploadedChunks: number[]
  hash?: string
  createdAt: Date
  updatedAt: Date
}

export interface UploadResult {
  success: boolean
  uploadedChunks: number[]
  isComplete: boolean
  fileId: string
  message?: string
}

export const initUploadSession = async (
  filename: string,
  filesize: number,
  totalChunks: number,
  hash?: string
): Promise<string> => {
  const db = getDB()
  
  if (!db) {
    throw new Error('数据库未初始化')
  }

  const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  db.run(`
    INSERT INTO upload_sessions (file_id, filename, filesize, total_chunks, uploaded_chunks, hash, created_at, updated_at)
    VALUES ("${fileId}", "${filename}", ${filesize}, ${totalChunks}, "[]", "${hash || ''}", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `)
  
  saveDB()
  
  const tempDir = getStoragePath('temp')
  const chunkDir = path.join(tempDir, fileId)
  fs.mkdirSync(chunkDir, { recursive: true })
  
  return fileId
}

export const uploadChunk = async (
  fileId: string,
  chunkIndex: number,
  chunkData: Buffer
): Promise<UploadResult> => {
  const db = getDB()
  if (!db) {throw new Error('数据库未初始化') }
  const result = db.exec(`SELECT * FROM upload_sessions WHERE file_id = "${fileId}"`)
  if (!result.length || !result[0].values.length) {
    return { success: false, uploadedChunks: [], isComplete: false, fileId, message: '上传会话不存在' }
  }
  const row = result[0].values[0]
  const totalChunks = row[3] as number
  const uploadedChunks = JSON.parse(row[4] as string || '[]') as number[]
  if (chunkIndex < 0 || chunkIndex >= totalChunks) {
    return { success: false, uploadedChunks, isComplete: false, fileId, message: '无效的分片索引' }
  }
  if (uploadedChunks.includes(chunkIndex)) {
    return { success: true, uploadedChunks, isComplete: uploadedChunks.length === totalChunks, fileId }
  }
  
  const tempDir = getStoragePath('temp')
  const chunkDir = path.join(tempDir, fileId)
  const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`)
  try {
    
    fs.writeFileSync(chunkPath, chunkData)
  } catch (error) {
    logger.error('Failed to write chunk:', error)
    return { success: false, uploadedChunks, isComplete: false, fileId, message: '写入分片失败' }
  }

  uploadedChunks.push(chunkIndex)
  uploadedChunks.sort((a, b) => a - b)

  const chunksJson = JSON.stringify(uploadedChunks)
  db.run(
    'UPDATE upload_sessions SET uploaded_chunks = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?',
    [chunksJson, fileId]
  )

  saveDB()

  const isComplete = uploadedChunks.length === totalChunks
  
  return { success: true, uploadedChunks, isComplete, fileId }
}

export const verifyChunkIntegrity = async (
  fileId: string,
  chunkIndex: number,
  expectedHash: string
): Promise<boolean> => {
  const tempDir = getStoragePath('temp')
  const chunkPath = path.join(tempDir, fileId, `chunk_${chunkIndex}`)
  
  if (!fs.existsSync(chunkPath)) {
    return false
  }

  const chunkData = fs.readFileSync(chunkPath)
  const crypto = await import('crypto')
  const hash = crypto.createHash('md5').update(chunkData).digest('hex')
  
  return hash === expectedHash
}

export const mergeChunks = async (fileId: string): Promise<string | null> => {
  const db = getDB()
  if (!db) {
    return null
  }
  const result = db.exec(`SELECT * FROM upload_sessions WHERE file_id = "${fileId}"`)
  if (!result.length || !result[0].values.length) {
    return null
  }

  const row = result[0].values[0]
  const filename = row[1] as string
  const totalChunks = row[3] as number
  const uploadedChunks = JSON.parse(row[4] as string || '[]') as number[]
  const expectedHash = row[5] as string | undefined

  if (uploadedChunks.length !== totalChunks) {
    return null
  }

  const tempDir = getStoragePath('temp')
  const chunkDir = path.join(tempDir, fileId)
  const documentsDir = getStoragePath('documents')
  
  const sanitizeFilename = (name: string): string => {
    const ext = path.extname(name)
    const base = path.basename(name, ext)
    const sanitized = base.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
    return `${sanitized}${ext}`
  }
  
  const sanitizedFilename = sanitizeFilename(filename)
  const newFilename = `${Date.now()}_${sanitizedFilename}`
  const outputPath = path.join(documentsDir, newFilename)

  try {
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true })
    }

    fs.writeFileSync(outputPath, '')

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`)

      if (!fs.existsSync(chunkPath)) {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath)
        }
        return null
      }

      const chunkData = fs.readFileSync(chunkPath)
      fs.appendFileSync(outputPath, chunkData)
      fs.unlinkSync(chunkPath)
    }

    const stats = fs.statSync(outputPath)
    if (stats.size === 0) {
      fs.unlinkSync(outputPath)
      return null
    }

    fs.rmdirSync(chunkDir)

    if (expectedHash) {
      const crypto = await import('crypto')
      const fileData = fs.readFileSync(outputPath)
      const actualHash = crypto.createHash('md5').update(fileData).digest('hex')
      
      if (actualHash !== expectedHash) {
        fs.unlinkSync(outputPath)
        return null
      }
    }

    db.run(`DELETE FROM upload_sessions WHERE file_id = "${fileId}"`)
    saveDB()

    return outputPath
  } catch (error) {
    logger.error('Merge chunks error:', error)
    return null
  }
}

export const getUploadSession = async (fileId: string): Promise<UploadSession | null> => {
  const db = getDB()
  if (!db) {
    return null
  }
  const result = db.exec(`SELECT * FROM upload_sessions WHERE file_id = "${fileId}"`)
  
  if (!result.length || !result[0].values.length) {
    return null
  }
  const row = result[0].values[0]
  return {
    fileId: row[0] as string,
    filename: row[1] as string,
    filesize: row[2] as number,
    totalChunks: row[3] as number,
    uploadedChunks: JSON.parse(row[4] as string || '[]') as number[],
    hash: row[5] as string || undefined,
    createdAt: new Date(row[6] as string),
    updatedAt: new Date(row[7] as string || row[6] as string)
  }
}

export const getUploadProgress = async (fileId: string): Promise<{ progress: number; uploadedChunks: number[] } | null> => {
  const session = await getUploadSession(fileId)

  if (!session) {
    return null
  }
  return {
    progress: Math.round((session.uploadedChunks.length / session.totalChunks) * 100),
    uploadedChunks: session.uploadedChunks
  }
}

export const cancelUploadSession = async (fileId: string): Promise<boolean> => {
  const db = getDB()
  
  if (!db) {
    return false
  }

  const result = db.exec(`SELECT file_id FROM upload_sessions WHERE file_id = "${fileId}"`)
  
  if (!result.length || !result[0].values.length) {
    return false
  }

  const chunkDir = path.join(getStoragePath('temp'), fileId)
  
  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true })
  }

  db.run(`DELETE FROM upload_sessions WHERE file_id = "${fileId}"`)
  saveDB()

  return true
}

export const cleanupExpiredSessions = async (hours = 24): Promise<void> => {
  const db = getDB()
  
  if (!db) {
    return
  }

  const result = db.exec(`SELECT file_id FROM upload_sessions WHERE updated_at < datetime('now', '-${hours} hours')`)
  
  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      const fileId = row[0] as string
      const chunkDir = path.join(getStoragePath('temp'), fileId)
      
      if (fs.existsSync(chunkDir)) {
        fs.rmSync(chunkDir, { recursive: true })
      }
    })
  }

  db.run(`DELETE FROM upload_sessions WHERE updated_at < datetime('now', '-${hours} hours')`)
  saveDB()
}

export const listUploadSessions = async (userId?: number): Promise<UploadSession[]> => {
  const db = getDB()
  if (!db) {return []}
  let query = 'SELECT * FROM upload_sessions ORDER BY created_at DESC'
  const result = db.exec(query)
  if (!result.length || !result[0].values.length) {
    return []
  }

  return result[0].values.map((row: unknown[]) => ({
    fileId: row[0] as string,
    filename: row[1] as string,
    filesize: row[2] as number,
    totalChunks: row[3] as number,
    uploadedChunks: JSON.parse(row[4] as string || '[]') as number[],
    hash: row[5] as string || undefined,
    createdAt: new Date(row[6] as string),
    updatedAt: new Date(row[7] as string || row[6] as string)
  }))
}

export const getSessionInfo = async (fileId: string): Promise<UploadSession | null> => {
  return getUploadSession(fileId)
}

export const getMissingChunks = async (fileId: string): Promise<number[] | null> => {
  const session = await getUploadSession(fileId)

  if (!session) {
    return null
  }

  const missing: number[] = []
  for (let i = 0; i < session.totalChunks; i++) {
    if (!session.uploadedChunks.includes(i)) {
      missing.push(i)
    }
  }

  return missing
}

export const checkSessionExists = async (fileId: string): Promise<boolean> => {
  const session = await getUploadSession(fileId)
  return session !== null
}

export const resumeUploadSession = async (fileId: string): Promise<{
  exists: boolean
  session: UploadSession | null
  missingChunks: number[]
  progress: number
} | null> => {
  const session = await getUploadSession(fileId)

  if (!session) {
    return null
  }

  const missingChunks = await getMissingChunks(fileId) || []
  const progress = Math.round((session.uploadedChunks.length / session.totalChunks) * 100)

  return {
    exists: true,
    session,
    missingChunks,
    progress
  }
}