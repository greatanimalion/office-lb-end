import { Request, Response } from 'express'
import { PermissionType } from '../constants/permission.js'
import logger from '../utils/logger.js'

export const getPermissionsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.documentId, 10)

    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }

    res.json([])
  } catch (error) {
    logger.error('Get permissions error:', error)
    res.status(500).json({ error: '获取权限列表失败' })
  }
}

export const setPermissionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.documentId, 10)
    const { userId, permission } = req.body

    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }

    if (!Object.values(PermissionType).includes(permission)) {
      res.status(400).json({ error: '无效的权限类型' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Set permission error:', error)
    res.status(500).json({ error: '设置权限失败' })
  }
}

export const removePermissionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.documentId, 10)
    const targetUserId = parseInt(req.params.userId, 10)

    if (isNaN(documentId) || isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的参数' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Remove permission error:', error)
    res.status(500).json({ error: '移除权限失败' })
  }
}