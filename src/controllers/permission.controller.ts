import { Request, Response } from 'express'
import {
  createPermission,
  getPermissionsForDocument,
  deletePermission,
} from '../services/permission.service.js'
import { getDocumentById } from '../services/document.service.js'
import { PermissionType } from '../utils/permission.js'
import logger from '../utils/logger.js'
import { generateLinkToken, generateToken } from '../utils/jwt.js'
import config from '../config/index.js'

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

    const permissions = await getPermissionsForDocument(documentId)
    res.json(permissions)
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
    const { id: operatorId } = (req as any).user
    const { toType, toId, permission, taragetId, password, count, groupId, startTime, endTime } = req.body
    const CreatedAt = new Date().getTime()
    if (isNaN(documentId)) {
      res.status(200).json({ success: false, message: '无效的文档ID' })
      return
    }
    const document = await getDocumentById(documentId)
    if (!document) {
      res.status(200).json({ success: false, message: '文档不存在' })
      return
    }

    if (!toId) {
      res.status(200).json({ success: false, message: '缺少目标用户ID' })
      return
    }

    if (!permission || isNaN(parseInt(permission, 10))) {
      res.status(200).json({ success: false, message: '无效的权限值' })
      return
    }

    const result = await createPermission(
      toType,
      operatorId,
      toId,
      taragetId,
      permission,
      startTime,
      endTime,
      password,
      count,
      CreatedAt,
      groupId
    )
    if (result.success) {
      const token = generateLinkToken({ permissionId: result.message as number })
      res.status(200).json({ success: true, message: '权限创建成功', token: config.nodeServerUrl +'/'+ token })
    } else {
      res.status(200).json({ success: false, message: '创建权限失败' })
    }
  } catch (error) {
    logger.error('Set permission error:', error)
    res.status(200).json({ success: false, message: '设置权限失败' })
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

    const success = await deletePermission(targetUserId, documentId)
    if (success) {
      res.status(200).json({ success: true, message: '权限移除成功' })
    } else {
      res.status(404).json({ success: false, message: '未找到对应的权限记录' })
    }
  } catch (error) {
    logger.error('Remove permission error:', error)
    res.status(500).json({ success: false, message: '移除权限失败' })
  }
}