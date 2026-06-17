import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth.middleware'
import { getDocumentById } from '../services/document.service'
import { PermissionType } from '../constants/permission'

export const checkDocumentPermission = (requiredPermission: PermissionType) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const documentId = parseInt(req.params.id || req.params.documentId, 10)
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ error: '未授权访问' })
      return
    }

    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }


    if (!document) {
      res.status(404).json({ error: '文档不存在或无权访问' })
      return
    }


   

    next()
  }
}

export const checkOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const documentId = parseInt(req.params.id, 10)
  const userId = req.user?.id

  if (!userId) {
    res.status(401).json({ error: '未授权访问' })
    return
  }




  next()
}