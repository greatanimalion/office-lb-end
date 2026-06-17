import bcrypt from 'bcryptjs'
import { getDB, saveDB} from '../db'
import {type  User } from '../models/user'
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
  }
  message?: string
}

export interface CreateUserOptions {
  username: string
  email: string
  role?: string
  provider?: string
  providerId?: string
  password?: string
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
    role: row[4] as string,
    group_id: row[7] as number || 0
  }
  console.log(user)
  const isValidPassword = bcrypt.compareSync(password, user.password)

  if (!isValidPassword) {
    return { success: false, message: '邮箱或密码错误' }
  }
  const token = generateToken({
    id: user.id,
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  })

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
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

  const result = db.exec(`SELECT * FROM users WHERE id = ${id}`)

  if (!result.length || !result[0].values.length) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    username: row[1] as string,
    email: row[2] as string,
    password: row[3] as string,
    role: row[4] as string
  }
}

export const getAllUsers = async (): Promise<User[]> => {
  const db = getDB()

  if (!db) {
    return []
  }

  const result = db.exec('SELECT id, username, email FROM users')
  const users: User[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      users.push({
        id: row[0] as number,
        username: row[1] as string,
        email: row[2] as string,
        password: '',
        role: ''
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


//关联账号
export const linkSocialAccount = async (
  userId: number,
  provider: string,
  providerUserId: string,
  accessToken?: string,
  refreshToken?: string,
  profileData?: Record<string, unknown>
): Promise<UserSocialAccount> => {
  const db = getDB()
  if (!db) throw new Error('数据库未初始化')

  const existing = db.exec(
    `SELECT * FROM user_social_accounts WHERE user_id = ${userId} AND provider = "${provider}"`
  )
  if (existing.length > 0 && existing[0].values.length > 0) {
    const row = existing[0].values[0]
    const now = new Date().toISOString()
    db.run(
      `UPDATE user_social_accounts SET
        provider_user_id = "${providerUserId}",
        access_token = ${accessToken ? `"${accessToken}"` : 'NULL'},
        refresh_token = ${refreshToken ? `"${refreshToken}"` : 'NULL'},
        profile_data = ${profileData ? `'${JSON.stringify(profileData)}'` : 'NULL'},
        updated_at = "${now}"
       WHERE id = ${row[0] as number}`
    )
    saveDB()
    return getSocialAccount(provider, Number(providerUserId))!
  }

  db.run(
    `INSERT INTO user_social_accounts (user_id, provider, provider_user_id, access_token, refresh_token, profile_data)
     VALUES (${userId}, "${provider}", "${providerUserId}",
       ${accessToken ? `"${accessToken}"` : 'NULL'},
       ${refreshToken ? `"${refreshToken}"` : 'NULL'},
       ${profileData ? `'${JSON.stringify(profileData)}'` : 'NULL'}
     )`
  )
  saveDB()

  return getSocialAccount(provider, Number(providerUserId))!
}
//根据provider 和 providerUserId获取账号
export const getSocialAccount = (provider: string, providerUserId: number): UserSocialAccount | null => {
  const db = getDB()
  if (!db) return null

  const result = db.exec(
    `SELECT * FROM user_social_accounts WHERE provider = "${provider}" AND provider_user_id = "${providerUserId}"`
  )
  if (!result.length || !result[0].values.length) return null
  return mapSocialAccountRow(result[0].values[0])
}
//创建SocialAccount
export const createSocialAccountOrUpdate = async (
  provider: string,
  providerUserId: number|string,
  accessToken?: string,
  refreshToken?: string,
  avatar?: string,
  profileData?:string
): Promise<UserSocialAccount> => {
  const db = getDB()
  if (!db) throw new Error('数据库未初始化')

  const existing = db.exec(
    `SELECT * FROM user_social_accounts WHERE provider = "${provider}" AND provider_user_id = "${Number(providerUserId)}"`
  )
  if (existing.length > 0 && existing[0].values.length > 0) {
    const row = existing[0].values[0]
    const now = new Date().toISOString()
    db.run(
      `UPDATE user_social_accounts SET
        avatar = ${avatar ? `"${avatar}"` : 'NULL'},
        provider_user_id = "${Number(providerUserId)}",
        access_token = ${accessToken ? `"${accessToken}"` : 'NULL'},
        refresh_token = ${refreshToken ? `"${refreshToken}"` : 'NULL'},
        profile_data = ${profileData ? `'${profileData}'` : 'NULL'},
        updated_at = "${now}"
       WHERE id = ${row[0] as number}`
    )
    saveDB()
    return getSocialAccount(provider, Number(providerUserId))!
  }
console.log(Number(111111))
  db.run(
    `INSERT INTO user_social_accounts (provider, provider_user_id, avatar, access_token, refresh_token, profile_data)
     VALUES ( "${provider}", "${Number(providerUserId)}",
       ${avatar ? `"${avatar}"` : 'NULL'},
       ${accessToken ? `"${accessToken}"` : 'NULL'},
       ${refreshToken ? `"${refreshToken}"` : 'NULL'},
       ${profileData ? `'${profileData}'` : 'NULL'}
     )`
  )
  saveDB()
  return getSocialAccount(provider, Number(providerUserId))!
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

const mapSocialAccountRow = (row: unknown[]): UserSocialAccount | null => {
  if (!row || row.length < 9) return null
  console.log('==row', row)
  return {
    id: row[0] as number,
    avatar: row[1] as string | null,
    userId: row[2] as number,
    provider: row[3] as string,
    providerUserId: row[4] as string,
    accessToken: row[5] as string | null,
    refreshToken: row[6] as string | null,
    profileData: row[7] as string | null,
    createdAt: row[8] as string,
    updatedAt: row[9] as string
  }
}

export { User }
