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
    userId: user.id,
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

export const createOrGetUser = async (options: CreateUserOptions): Promise<User> => {
  const db = getDB()

  if (!db) {
    throw new Error('数据库未初始化')
  }

  const { username, email, role = 'user', provider, providerId } = options

  if (provider && providerId) {
    const existingResult = db.exec(
      `SELECT * FROM users WHERE provider = "${provider}" AND provider_id = "${providerId}"`
    )
    
    if (existingResult.length > 0 && existingResult[0].values.length > 0) {
      const row = existingResult[0].values[0]
      return {
        id: row[0] as number,
        username: row[1] as string,
        email: row[2] as string,
        password: row[3] as string,
        role: row[4] as string
      }
    }
  }

  const randomPassword = bcrypt.hashSync(Math.random().toString(36).substr(2, 11), config.auth.bcryptSaltRounds)
  
  db.run(
    `INSERT INTO users (username, email, password, role, provider, provider_id) 
     VALUES ("${username}", "${email}", "${randomPassword}", "${role}", "${provider || ''}", "${providerId || ''}")`
  )

  const lastIdResult = db.exec('SELECT last_insert_rowid()')
  const lastId = lastIdResult[0].values[0][0] as number

  saveDB()

  return {
    id: lastId,
    username,
    email,
    password: randomPassword,
    role
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

export { User }
