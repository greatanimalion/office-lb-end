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
  createdAt: string
}

export const logAction = async (
  userId: number,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: number,
  details?: string
): Promise<void> => {
  const db = getDB()

  if (!db) {
    return
  }

  const documentId = entityType === AuditEntityType.DOCUMENT ? entityId : null

  db.run(
    `INSERT INTO audit_logs (user_id, document_id, action, entity_type, details) VALUES (${userId}, ${documentId || 'NULL'}, "${action}", "${entityType}", "${details || ''}")`
  )
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
  const db = getDB()

  if (!db) {
    return []
  }

  const { userId, documentId, action, startDate, endDate, limit = 100, offset = 0 } = options

  let query = 'SELECT * FROM audit_logs WHERE 1=1'

  if (userId) {
    query += ` AND user_id = ${userId}`
  }

  if (documentId) {
    query += ` AND document_id = ${documentId}`
  }

  if (action) {
    query += ` AND action = "${action}"`
  }

  if (startDate) {
    query += ` AND created_at >= "${startDate}"`
  }

  if (endDate) {
    query += ` AND created_at <= "${endDate}"`
  }

  query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`

  const result = db.exec(query)
  const logs: AuditLog[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      logs.push({
        id: row[0] as number,
        userId: row[1] as number,
        documentId: row[2] as number | undefined,
        action: row[3] as AuditAction,
        entityType: row[4] as AuditEntityType,
        details: row[5] as string | undefined,
        ipAddress: row[6] as string | undefined,
        userAgent: row[7] as string | undefined,
        createdAt: row[8] as string
      })
    })
  }

  return logs
}