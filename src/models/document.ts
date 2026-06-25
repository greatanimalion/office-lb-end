export type OwnerType = 'group' | 'user' | 'folder' | 'public'
export interface DocumentVersion {
  id: number
  document_id: number//集合映射，多对一关系
  filepath: string
  fileSize: number
  v_number: number
  alter_by: number//修改的用户id
  created_at: string
}
export interface Document {
  id: number
  document_v_id: number//确定当前的文档版本
  updated_at: string
  locked_by?: number//文档被锁定时，locked_by为锁定用户的id
  status: number//文档状态，1为活跃，0为已删除
  owner_id: number
  owner_type: OwnerType//ownerID与ownerType对应，用于记录文档的归属关系
  locked: number
  permission?: string//空代表无权限
  created_at: string
  version_number: number//文档版本号
  title: string
}
export interface DocumentShare {
  id: number
  documentId: number
  userId: number
  permission: string
  sharedBy: number
  createdAt: Date
}