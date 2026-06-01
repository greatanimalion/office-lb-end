import { Request, Response } from 'express'
import {
  initUploadSession,
  uploadChunk,
  mergeChunks,
  getUploadProgress,
  cancelUploadSession,
  listUploadSessions,
  verifyChunkIntegrity,
  getMissingChunks,
  checkSessionExists,
  resumeUploadSession,
  getSessionInfo
} from '../services/upload.service'
import { createDocument } from '../services/document.service'
import logger from '../utils/logger'
import path from 'path'
const getUserId = (req: Request): number => {
  return (req.user as { id: number })?.id
}

export const initUploadController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, filesize, totalChunks, hash } = req.body

    if (!filename || !filesize || !totalChunks) {
      res.status(400).json({ error: '缺少必要参数' })
      return
    }
    const fileId = await initUploadSession(filename, filesize, totalChunks, hash)
    res.json({
      success: true,
      fileId,
      filename,
      filesize,
      totalChunks
    })
  } catch (error) {
    logger.error('Init upload error:', error)
    res.status(500).json({ error: '初始化上传失败' })
  }
}

export const uploadChunkController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, totalChunks, hash ,chunkIndex} = req.body
    const _chunkIndex = parseInt(chunkIndex, 10)
    const file = req.file
    if (!fileId || isNaN(_chunkIndex) || !totalChunks) {
      res.status(400).json({ error: '缺少必要参数' })
      return
    }
    let chunkData: Buffer | null = null
    if (file && file.buffer && file.buffer.length > 0) {
      chunkData = file.buffer
    } else if (req.body.chunkData) {
      if (typeof req.body.chunkData === 'string') {
        const base64Match = req.body.chunkData.match(/^data:.*?;base64,(.+)$/)
        chunkData = Buffer.from(base64Match ? base64Match[1] : req.body.chunkData, 'base64')
      } else if (Buffer.isBuffer(req.body.chunkData)) {
        chunkData = req.body.chunkData
      }
    } else if (req.body instanceof Buffer && req.body.length > 0) {
      chunkData = req.body
    }

    if (!chunkData || chunkData.length === 0) {
      res.status(400).json({ error: '缺少分片数据或分片数据为空' })
      return
    }

    logger.debug(`Uploading chunk ${_chunkIndex}/${totalChunks - 1}, size: ${chunkData.length} bytes`)

    const result = await uploadChunk(fileId, _chunkIndex, chunkData)

    if (!result.success) {
      res.status(400).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    logger.error('Upload chunk error:', error)
    res.status(500).json({ error: '上传分片失败' })
  }
}

export const mergeChunksController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, title, fileSize } = req.body
    const userId = getUserId(req)
    if (!fileId) {
      res.status(400).json({ error: '缺少文件ID' })
      return
    }
    const outputPath = await mergeChunks(fileId)
    if (!outputPath) {
      res.status(400).json({ error: '合并分片失败，分片不完整' })
      return
    }
    const filename = path.basename(outputPath)

    const documentId = await createDocument(
      title || filename,
      filename,
      outputPath,
      userId,
      fileSize
    )
    
    res.json({
      success: true,
      documentId,
      filename,
      filepath: outputPath
    })
  } catch (error) {
    logger.error('Merge chunks error:', error)
    res.status(500).json({ error: '合并分片失败' })
  }
}

export const getUploadProgressController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params

    if (!fileId) {
      res.status(400).json({ error: '缺少文件ID' })
      return
    }

    const progress = await getUploadProgress(fileId)

    if (!progress) {
      res.status(404).json({ error: '上传会话不存在' })
      return
    }

    res.json({
      success: true,
      ...progress
    })
  } catch (error) {
    logger.error('Get upload progress error:', error)
    res.status(500).json({ error: '获取上传进度失败' })
  }
}

export const cancelUploadController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params

    if (!fileId) {
      res.status(400).json({ error: '缺少文件ID' })
      return
    }

    const success = await cancelUploadSession(fileId)

    if (!success) {
      res.status(404).json({ error: '上传会话不存在' })
      return
    }

    res.json({ success: true, message: '上传已取消' })
  } catch (error) {
    logger.error('Cancel upload error:', error)
    res.status(500).json({ error: '取消上传失败' })
  }
}

export const listUploadSessionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await listUploadSessions()
    res.json(sessions)
  } catch (error) {
    logger.error('List upload sessions error:', error)
    res.status(500).json({ error: '获取上传列表失败' })
  }
}

export const verifyChunkController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, _chunkIndex, hash } = req.body

    if (!fileId || _chunkIndex === undefined || !hash) {
      res.status(400).json({ error: '缺少必要参数' })
      return
    }

    const isValid = await verifyChunkIntegrity(fileId, _chunkIndex, hash)

    res.json({
      success: true,
      isValid,
      fileId,
      _chunkIndex
    })
  } catch (error) {
    logger.error('Verify chunk error:', error)
    res.status(500).json({ error: '校验分片失败' })
  }
}

export const resumeSessionController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    if (!fileId) {
      res.status(400).json({ error: '缺少文件ID' })
      return
    }
    const resumeInfo = await resumeUploadSession(fileId)
    if (!resumeInfo) {
      res.status(404).json({ error: '上传会话不存在或已过期', exists: false })
      return
    }
    res.json({
      success: true,
      exists: true,
      fileId,
      filename: resumeInfo.session?.filename,
      filesize: resumeInfo.session?.filesize,
      totalChunks: resumeInfo.session?.totalChunks,
      uploadedChunks: resumeInfo.session?.uploadedChunks,
      missingChunks: resumeInfo.missingChunks,
      progress: resumeInfo.progress
    })
  } catch (error) {
    logger.error('Resume session error:', error)
    res.status(500).json({ error: '恢复上传会话失败' })
  }
}

export const checkSessionController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    if (!fileId) {
      res.status(400).json({ error: '缺少文件ID' })
      return
    }
    const exists = await checkSessionExists(fileId)
    if (!exists) {
      res.json({ success: true, exists: false, fileId })
      return
    }
    const session = await getSessionInfo(fileId)
    res.json({
      success: true,
      exists: true,
      fileId,
      filename: session?.filename,
      filesize: session?.filesize,
      totalChunks: session?.totalChunks,
      uploadedChunks: session?.uploadedChunks
    })
  } catch (error) {
    logger.error('Check session error:', error)
    res.status(500).json({ error: '检查上传会话失败' })
  }
}

export const getMissingChunksController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params

    if (!fileId) {
      res.status(400).json({ error: '缺少文件ID' })
      return
    }

    const missing = await getMissingChunks(fileId)

    if (missing === null) {
      res.status(404).json({ error: '上传会话不存在' })
      return
    }

    res.json({
      success: true,
      fileId,
      missingChunks: missing,
      missingCount: missing.length
    })
  } catch (error) {
    logger.error('Get missing chunks error:', error)
    res.status(500).json({ error: '获取缺失分片失败' })
  }
}