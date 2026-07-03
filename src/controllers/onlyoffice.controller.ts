import { Request, Response } from 'express'
import { generateEditorConfig, handleCallback } from '../services/onlyoffice.service.js'
import { getDocumentById } from '../services/document.service.js'
import { checkDocumentAccess } from '../services/permission.service.js'
import logger from '../utils/logger.js'
import _config from '../config/index.js'
import { getUserById } from '../services/user.service.js'

export const getEditorConfigController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.documentId, 10)
    const { id } = req.user as any
    if (isNaN(documentId)) {
      res.status(200).json({ success: false, error: '无效的文档ID' })
      return
    }
    const document = await getDocumentById(documentId)
    if (!document) {
      res.status(200).json({ success: false, error: '文档不存在或无权访问' })
      return
    }
    const u = await getUserById(id)
    if (!u) {
      res.status(200).json({ success: false, error: '用户不存在' })
      return
    }

    const access = await checkDocumentAccess(
      {
        id: document.id!,
        ownerId: document.owner_id!,
        ownerType: document.owner_type!,
        permission: document.permission,
      },
      id,
      u.role!,
    )
    if (!access.VIEW) {
      res.status(200).json({ success: false, error: '文档不存在或无权访问' })
      return
    }
    //判断文档是否被锁定,除锁定者，任何人无法编辑
    if (document.locked === 1&&document.locked_by !== id) {
      access.EDIT = false
    }

    const editorConfig = generateEditorConfig(
      document.id!,
      document.title!,
      {
        id: id.toString(),
        name: u.username!,
        avatar: u.avatar!,
      },
      document.v_number!,
      access
    )

    res.send(editorConfig)
  } catch (error) {
    logger.error('Get editor config error:', error)
    res.status(500).json({ success: false, error: '获取编辑器配置失败' })
  }
}

export const callbackController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await handleCallback(req.body)
    res.json({"error": 0})
  } catch (error) {
    logger.error('OnlyOffice callback error:', error)
    res.status(500).json({ error: '回调处理失败' })
  }
}