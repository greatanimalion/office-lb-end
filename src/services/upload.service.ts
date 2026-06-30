import fs from 'fs'
import path from 'path'
import { getDB } from '../db'
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
  const prisma = getDB()

  const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await prisma.uploadSession.create({
    data: {
      fileId,
      filename,
      filesize,
      totalChunks,
      uploadedChunks: '[]',
      hash: hash || null,
    },
  })

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
  const prisma = getDB()

  const session = await prisma.uploadSession.findUnique({ where: { fileId } })
  if (!session) {
    return { success: false, uploadedChunks: [], isComplete: false, fileId, message: '上传会话不存在' }
  }

  const totalChunks = session.totalChunks
  const uploadedChunks = JSON.parse(session.uploadedChunks || '[]') as number[]

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

  await prisma.uploadSession.update({
    where: { fileId },
    data: {
      uploadedChunks: JSON.stringify(uploadedChunks),
    },
  })

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
  const prisma = getDB()

  const session = await prisma.uploadSession.findUnique({ where: { fileId } })
  if (!session) return null

  const filename = session.filename
  const totalChunks = session.totalChunks
  const uploadedChunks = JSON.parse(session.uploadedChunks || '[]') as number[]
  const expectedHash = session.hash || undefined

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

    await prisma.uploadSession.delete({ where: { fileId } })

    return outputPath
  } catch (error) {
    logger.error('Merge chunks error:', error)
    return null
  }
}

export const getUploadSession = async (fileId: string): Promise<UploadSession | null> => {
  const prisma = getDB()

  const session = await prisma.uploadSession.findUnique({ where: { fileId } })
  if (!session) return null

  return {
    fileId: session.fileId,
    filename: session.filename,
    filesize: session.filesize,
    totalChunks: session.totalChunks,
    uploadedChunks: JSON.parse(session.uploadedChunks || '[]') as number[],
    hash: session.hash || undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

export const getUploadProgress = async (fileId: string): Promise<{ progress: number; uploadedChunks: number[] } | null> => {
  const session = await getUploadSession(fileId)

  if (!session) return null

  return {
    progress: Math.round((session.uploadedChunks.length / session.totalChunks) * 100),
    uploadedChunks: session.uploadedChunks,
  }
}

export const cancelUploadSession = async (fileId: string): Promise<boolean> => {
  const prisma = getDB()

  const session = await prisma.uploadSession.findUnique({ where: { fileId } })
  if (!session) return false

  const chunkDir = path.join(getStoragePath('temp'), fileId)

  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true })
  }

  await prisma.uploadSession.delete({ where: { fileId } })

  return true
}

export const cleanupExpiredSessions = async (hours = 24): Promise<void> => {
  const prisma = getDB()

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

  const expiredSessions = await prisma.uploadSession.findMany({
    where: { updatedAt: { lt: cutoff } },
  })

  for (const session of expiredSessions) {
    const chunkDir = path.join(getStoragePath('temp'), session.fileId)
    if (fs.existsSync(chunkDir)) {
      fs.rmSync(chunkDir, { recursive: true })
    }
  }

  await prisma.uploadSession.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  })
}

export const listUploadSessions = async (userId?: number): Promise<UploadSession[]> => {
  const prisma = getDB()

  const sessions = await prisma.uploadSession.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return sessions.map(s => ({
    fileId: s.fileId,
    filename: s.filename,
    filesize: s.filesize,
    totalChunks: s.totalChunks,
    uploadedChunks: JSON.parse(s.uploadedChunks || '[]') as number[],
    hash: s.hash || undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
}

export const getSessionInfo = async (fileId: string): Promise<UploadSession | null> => {
  return getUploadSession(fileId)
}

export const getMissingChunks = async (fileId: string): Promise<number[] | null> => {
  const session = await getUploadSession(fileId)

  if (!session) return null

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

  if (!session) return null

  const missingChunks = await getMissingChunks(fileId) || []
  const progress = Math.round((session.uploadedChunks.length / session.totalChunks) * 100)

  return {
    exists: true,
    session,
    missingChunks,
    progress,
  }
}
