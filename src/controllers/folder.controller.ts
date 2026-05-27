import { Response } from 'express'
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js'
import logger from '../utils/logger.js'

export const createFolderController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, parentId } = req.body
    const userId = req.user!.id

    if (!name) {
      res.status(400).json({ error: '文件夹名称不能为空' })
      return
    }

    res.status(201).json({ id: 1, name, parentId, ownerId: userId })
  } catch (error) {
    logger.error('Create folder error:', error)
    res.status(500).json({ error: '创建文件夹失败' })
  }
}

export const getFoldersController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id
    const folders: any[] = []

    res.json(folders)
  } catch (error) {
    logger.error('Get folders error:', error)
    res.status(500).json({ error: '获取文件夹列表失败' })
  }
}

export const updateFolderController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const folderId = parseInt(req.params.id, 10)
    const { name } = req.body

    if (isNaN(folderId)) {
      res.status(400).json({ error: '无效的文件夹ID' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Update folder error:', error)
    res.status(500).json({ error: '更新文件夹失败' })
  }
}

export const deleteFolderController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const folderId = parseInt(req.params.id, 10)

    if (isNaN(folderId)) {
      res.status(400).json({ error: '无效的文件夹ID' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Delete folder error:', error)
    res.status(500).json({ error: '删除文件夹失败' })
  }
}