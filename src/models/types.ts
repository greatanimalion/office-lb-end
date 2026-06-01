export interface User {
  id: number
  username: string
  email: string
  password: string
  role: string
  createdAt?: Date
  updatedAt?: Date
}



export interface Folder {
  id: number
  name: string
  parentId: number | null
  ownerId: number
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: number
  userId: number
  documentId: number
  permissionType: string
  grantedBy: number
  createdAt: Date
  updatedAt: Date
}

export interface DocumentShare {
  id: number
  documentId: number
  userId: number
  permission: string
  sharedBy: number
  createdAt: Date
}

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
export interface Document {
  id: number
  title: string
  filename: string
  filepath: string
  owner_id: number
  fileSize: number
  version_number: number
  status: string
  locked: boolean
  locked_by?: number
  created_at: string
  updated_at: string
}
export interface DocumentVersion {
  id: number
  documentId: number
  version: number
  fileSize: number
  filepath: string
  createdBy: number
  createdAt: Date
  comment?: string
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


