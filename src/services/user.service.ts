import bcrypt from 'bcryptjs'
import { getDB, saveDB, User } from '../db'
import { generateToken } from '../utils/jwt'
import config from '../config/index'

export interface LoginResult {
  success: boolean
  token?: string
  user?: {
    id: number
    username: string
    role: string
  }
  error?: string
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
  const db = getDB()

  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }

  const userResult = db.exec(`SELECT * FROM users WHERE username = "${username}"`)

  if (!userResult.length || !userResult[0].values.length) {
    return { success: false, error: '用户名或密码错误' }
  }

  const row = userResult[0].values[0]
  const user: User = {
    id: row[0] as number,
    username: row[1] as string,
    email: row[2] as string,
    password: row[3] as string,
    role: row[4] as string
  }

  const isValidPassword = bcrypt.compareSync(password, user.password)

  if (!isValidPassword) {
    return { success: false, error: '用户名或密码错误' }
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role
  })

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
}

export const register = async (
  username: string,
  email: string,
  password: string
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