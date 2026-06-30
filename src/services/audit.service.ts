import { getDB } from '../db'
import { AuditAction, AuditEntityType } from '../constants/audit'

export interface AuditLog {
  id: number
  userId: number
  documentId?: number
  action: AuditAction
  entityType: AuditEntityType
  entityId?: number
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export const logAction = async (
  userId: number,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: number,
  details?: string
): Promise<void> => {
  const prisma = getDB()

  const documentId = entityType === AuditEntityType.DOCUMENT ? entityId : null

  await prisma.auditLog.create({
    data: {
      userId,
      documentId: documentId || undefined,
      action,
      entityType,
      details: details || undefined,
    },
  })
}

export const getAuditLogs = async (
  options: {
    userId?: number
    documentId?: number
    action?: AuditAction
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}
): Promise<AuditLog[]> => {
  const prisma = getDB()

  const { userId, documentId, action, startDate, endDate, limit = 100, offset = 0 } = options

  const where: Record<string, unknown> = {}

  if (userId) where.userId = userId
  if (documentId) where.documentId = documentId
  if (action) where.action = action
  if (startDate) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(startDate) }
  if (endDate) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(endDate) }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return logs as unknown as AuditLog[]
}
