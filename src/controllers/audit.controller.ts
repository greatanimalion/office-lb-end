import { Response } from 'express'
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js'
import { getAuditLogs, AuditLog } from '../services/audit.service.js'
import { AuditAction } from '../constants/audit.js'
import logger from '../utils/logger.js'

export const getAuditLogsController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId, documentId, action, startDate, endDate, limit, offset } = req.query
    const userIdNum = userId ? parseInt(userId as string, 10) : undefined
    const documentIdNum = documentId ? parseInt(documentId as string, 10) : undefined
    const actionEnum = action as AuditAction | undefined
    const limitNum = limit ? parseInt(limit as string, 10) : undefined
    const offsetNum = offset ? parseInt(offset as string, 10) : undefined

    const logs = await getAuditLogs({
      userId: userIdNum,
      documentId: documentIdNum,
      action: actionEnum,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limitNum,
      offset: offsetNum
    })

    res.json(logs)
  } catch (error) {
    logger.error('Get audit logs error:', error)
    res.status(500).json({ error: '获取审计日志失败' })
  }
}