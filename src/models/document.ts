
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
  document_id: number
  version_number: number
  filesize: number
  filepath: string
  created_by: number
  created_at: Date
}
export interface DocumentShare {
  id: number
  documentId: number
  userId: number
  permission: string
  sharedBy: number
  createdAt: Date
}