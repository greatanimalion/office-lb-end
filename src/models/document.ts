export type OwnerType = 'group'|'user'|'folder'|'public'
//直接显示的文档
export interface Document {
  id: number
  title: string
  filename: string
  filepath: string
  owner_id: number
  owner_type: OwnerType
  fileSize: number
  version_number: number
  status: string
  locked: boolean
  locked_by?: number
  created_at: string
  updated_at: string
}
//提供文档版本管理功能，只有删除某一版本，才算是真正删除某一文档（删除前需要查询本条记录是否时最后一个使用，若是则世界删除服务器源文件
// ），若是删除文档，可以通过版本进行回溯
export interface DocumentVersion {
  id: number
  filename: string
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