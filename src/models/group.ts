export interface Group {
  id: number
  name: string
  ownerId: number
  description: string
  createdAt: Date
}
export interface GroupUser {
  id: number
  groupId: number
  userId: number
  role: string
  authority: string
  addedAt: Date
}
export interface GroupTemplate  {
  id: number
  groupId: number
  documentId: number
  createdAt: Date
}
