import bcrypt from 'bcryptjs'
import { getDB, saveDB } from '../db'
import { type User } from '../models/user'
import { generateToken } from '../utils/jwt'
import config from '../config/index'

export interface LoginResult {
  success: boolean
  token?: string
  user?: {
    id: number
    email: string
    role: string
    group_id?: number
    avatar?: string | null
    username?: string
  }
  message?: string
}

export interface CreateUserOptions {
  email: string
  role?: string
  provider?: string
  providerId?: string
  password?: string
  username?: string
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const db = getDB()
  if (!db) {
    return { success: false, message: '数据库未初始化' }
  }
  const userResult = db.exec(`SELECT * FROM users WHERE email = "${email}"`)
  if (!userResult.length || !userResult[0].values.length) {
    return { success: false, message: '邮箱或密码错误' }
  }

  const row = userResult[0].values[0]
  const user: User = {
    id: row[0] as number,
    username: row[1] as string,
    email: row[2] as string,
    password: row[3] as string,
    avatar: row[9] as string | null,
    role: row[4] as string,
    group_id: row[7] as number || 0
  }
  const isValidPassword = bcrypt.compareSync(password, user.password!)

  if (!isValidPassword) {
    return { success: false, message: '邮箱或密码错误' }
  }
  const token = generateToken({
    id: user.id,
    role: user.role,
  })
  //更新登录时间
  db.run(`UPDATE users SET last_login_at = datetime('now', 'localtime') WHERE id = ${user.id}`)
  saveDB()
  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      group_id: user.group_id
    }
  }
}

export const register = async (
  username: string,
  email: string,
  password: string,
): Promise<{ success: boolean; id?: number; error?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }
  try {
    const hashedPassword = bcrypt.hashSync(password, config.auth.bcryptSaltRounds)
    db.run(
      `INSERT INTO users (username, email, password) VALUES ("${username}", "${email}", "${hashedPassword}")`
    )
    const lastIdResult = db.exec('SELECT last_insert_rowid()')
    const lastId = lastIdResult[0].values[0][0] as number

    db.run(`INSERT INTO audit_logs (user_id, action) VALUES (${lastId}, "用户注册")`)
    saveDB()

    return { success: true, id: lastId }
  } catch (err) {
    return { success: false, error: '用户名或邮箱已存在' }
  }
}

export const getUserById = async (id: number): Promise<User | null> => {
  const db = getDB()
  if (!db) {
    return null
  }

  const result = db.exec(`SELECT id, username, email, password, avatar, role FROM users WHERE id = ${id}`)

  if (!result.length || !result[0].values.length) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    username: row[1] as string,
    email: row[2] as string,
    password: row[3] as string,
    avatar: row[4] as string | null,
    role: row[5] as string
  }
}
type OmitUser = Omit<User,'password'|'role'>
export const getAllUsers = async (): Promise<OmitUser[]> => {
  const db = getDB()

  if (!db) {
    return []
  }

  const result = db.exec('SELECT id, username, email, avatar, provider, last_login_at, group_id FROM users')
  const users: OmitUser[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      users.push({
        id: row[0] as number,
        username: row[1] as string,
        email: row[2] as string,
        avatar: row[3] as string | null,
        provider: row[4] as string,
        last_login_at: row[5] as string,
        group_id: row[6] as number || 0
      })
    })
  }

  return users
}

export interface UserSocialAccount {
  id: number
  userId: number
  avatar?: string | null
  provider: string
  providerUserId: string
  accessToken: string | null
  refreshToken: string | null
  profileData: string | null
  createdAt: string
  updatedAt: string
}




//创建tampAccount
export const createTampAccountOrUpdate = async (
  name: string,
  provider: string,
  providerUserId: number | string,
  avatar?: string,
): Promise<void> => {
  const db = getDB()
  if (!db) throw new Error('数据库未初始化')

  const existing = db.exec(
    `SELECT * FROM users WHERE provider = "${provider}" AND provider_id = ${Number(providerUserId)}`
  )
  console.log(existing)

  if (existing.length > 0 && existing[0].values.length > 0) {
    const row = existing[0].values[0]
    const now = new Date().toISOString()
    db.run(
      `UPDATE users SET
        username = "${name}",
        avatar = ${avatar ? `"${avatar}"` : 'NULL'},
        provider_id = ${Number(providerUserId)},
        last_login_at = "${now}"
       WHERE id = ${row[0] as number}`
    )
    saveDB()
    return
  }
  db.run(
    `INSERT INTO users (username, provider, provider_id, avatar, last_login_at)
     VALUES ( "${name}", "${provider}", "${Number(providerUserId)}",
       ${avatar ? `"${avatar}"` : 'NULL'},
       "${new Date().toISOString()}"
     )`
  )
  saveDB()
}

export const getSocialAccountsByUserId = async (provider_id: number | string, provider: string): Promise<User | null> => {
  const db = getDB()
  if (!db) return null
  const result = db.exec(`SELECT * FROM users WHERE provider_id = ${Number(provider_id)} AND provider = "${provider}"`)
  let socialAccounts: User | null = null
  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      socialAccounts = {
        id: row[0] as number,
        username: row[1] as string,
        email: row[2] as string,
        password: '',
        role: row[4] as string,
        group_id: row[5] as number,
        provider: row[6] as string,
        provider_id: Number(row[7] as string),
        last_login_at: row[8] as string,
        avatar: row[9] as string | null,
      }
    })
  }
  return socialAccounts || null
}

export const updateSocialAccountToken = async (
  id: number,
  accessToken: string,
  refreshToken?: string
): Promise<boolean> => {
  const db = getDB()
  if (!db) return false

  const now = new Date().toISOString()
  const refreshPart = refreshToken !== undefined
    ? `, refresh_token = "${refreshToken}"`
    : ''

  db.run(
    `UPDATE user_social_accounts SET access_token = "${accessToken}"${refreshPart}, updated_at = "${now}" WHERE id = ${id}`
  )
  saveDB()
  return true
}

export const unlinkSocialAccount = async (userId: number, provider: string): Promise<boolean> => {
  const db = getDB()
  if (!db) return false

  db.run(`DELETE FROM user_social_accounts WHERE user_id = ${userId} AND provider = "${provider}"`)
  saveDB()
  return true
}

export const deleteSocialAccount = async (id: number): Promise<boolean> => {
  const db = getDB()
  if (!db) return false

  db.run(`DELETE FROM user_social_accounts WHERE id = ${id}`)
  saveDB()
  return true
}


export { User }
