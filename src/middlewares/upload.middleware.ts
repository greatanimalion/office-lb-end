import { Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { getStoragePath, isAllowedFileType } from '../utils/file'
import { MAX_FILE_SIZE } from '../constants/document'

export const createUploadMiddleware = (fieldName: string = 'file'):any => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(getStoragePath(), 'documents')
      cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}`
      const filename = `${uniqueSuffix}${path.extname(file.originalname)}`
      cb(null, filename)
    }
  })
  const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (isAllowedFileType(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE
    }  
  }).single(fieldName)
}

export const handleUploadError = (
  err: Error,
  req: Express.Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.message === 'Unsupported file type') {
    res.status(400).json({ error: '不支持的文件类型' })
    return
  }

  if (err.message.includes('File too large')) {
    res.status(400).json({ error: '文件大小超过限制' })
    return
  }

  res.status(500).json({ error: '文件上传失败' })
}