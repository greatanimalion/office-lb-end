import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth.middleware.js'
import { logAction } from '../services/audit.service.js'
import { AuditAction, AuditEntityType } from '../constants/audit.js'

export const auditAction = (
  action: AuditAction,
  entityType: AuditEntityType = AuditEntityType.DOCUMENT
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id ? parseInt(req.params.id, 10) : undefined

        logAction(
          req.user.id!,
          action,
          entityType,
          entityId,
          `${action}: ${req.method} ${req.path}`
        ).catch((err) => {
          console.error('Audit log error:', err)
        })
      }

      return originalJson(body)
    }

    next()
  }
}