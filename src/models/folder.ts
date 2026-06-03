export interface Folder {
  id: number
  filename: string
  parentFolderId?: number
  groupId: number
  createdAt: Date
  updatedAt: Date
}
