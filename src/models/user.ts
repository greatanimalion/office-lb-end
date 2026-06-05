export interface User {
  id: number
  username: string
  email: string
  password: string
  role: string
  group_id?: number
  createdAt?: Date
  updatedAt?: Date
}