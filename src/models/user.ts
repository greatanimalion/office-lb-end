export interface User {
  id: number
  username: string
  email: string
  password: string
  role: string
  provider?: string
  provider_id?: number
  group_id?: number
  createdAt?: Date
  updatedAt?: Date
  last_login_at?: string
  avatar?: string | null
}