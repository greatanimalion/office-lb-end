import { Request, Response } from 'express'
import { generateEditorConfig, handleCallback } from '../services/onlyoffice.service.js'
import { getDocumentById } from '../services/document.service.js'
import logger from '../utils/logger.js'
import _config from '../config/index.js'
import { getUserById } from '../services/user.service.js'
export const getEditorConfigController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.documentId, 10)
    const {id}=req.user as any
    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }
    const document = await getDocumentById(documentId)
    if (!document) {
      res.status(404).json({ error: '文档不存在或无权访问' })
      return
    }
    const u=await getUserById(id)
    if (!u) {
      res.status(200).json({ error: '用户不存在' })
      return
    }
    const editorConfig = generateEditorConfig(
      document.id!,
      document.title!,
      true,
      {
        id: id.toString(),
        name: u.username
      }
    )

    res.send(editorConfig)
  } catch (error) {
    logger.error('Get editor config error:', error)
    res.status(500).json({ error: '获取编辑器配置失败' })
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