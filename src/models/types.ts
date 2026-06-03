export * from './folder'
export * from './document'
export * from './group'
export * from './user'





export interface ShareLink {
  id: number
  documentId: number
  token: string
  password?: string
  expiresAt?: Date
  permission: string
  createdBy: number
  createdAt: Date
}

export interface AuditLog {
  id: number
  userId: number
  documentId?: number
  action: string
  entityType: string
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}


