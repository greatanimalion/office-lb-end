import { Request, Response } from 'express'
import logger from '../utils/logger.js'

const getUserId = (req: Request): number => {
  return (req.user as { id: number })?.id
}

export const createFolderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, parentId } = req.body
    const userId = getUserId(req)

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
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as { id: number })?.id
    const folders: any[] = []

    res.json(folders)
  } catch (error) {
    logger.error('Get folders error:', error)
    res.status(500).json({ error: '获取文件夹列表失败' })
  }
}

export const updateFolderController = async (
  req: Request,
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
  req: Request,
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