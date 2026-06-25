export interface Folder {
  id: number
  filename: string
  parentFolderId?: number
  permission?: string//空代表无权限
  groupId: number
  createdAt: Date
  updatedAt: Date
}
