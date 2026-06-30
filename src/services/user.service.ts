import bcrypt from 'bcryptjs'
import { getDB } from '../db'
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
  const prisma = getDB()

  const userRecord = await prisma.user.findFirst({
    where: { email },
  })

  if (!userRecord) {
    return { success: false, message: '邮箱或密码错误' }
  }

  const isValidPassword = bcrypt.compareSync(password, userRecord.password || '')

  if (!isValidPassword) {
    return { success: false, message: '邮箱或密码错误' }
  }

  const token = generateToken({
    id: userRecord.id,
    role: userRecord.role,
  })

  await prisma.user.update({
    where: { id: userRecord.id },
    data: { lastLoginAt: new Date().toISOString() },
  })

  return {
    success: true,
    token,
    user: {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email || '',
      role: userRecord.role,
      avatar: userRecord.avatar,
      group_id: userRecord.groupId || 0,
    },
  }
}

export const register = async (
  username: string,
  email: string,
  password: string,
): Promise<{ success: boolean; id?: number; error?: string }> => {
  const prisma = getDB()
  try {
    const hashedPassword = bcrypt.hashSync(password, config.auth.bcryptSaltRounds)
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: '用户注册',
      },
    })

    return { success: true, id: user.id }
  } catch (err) {
    return { success: false, error: '用户名或邮箱已存在' }
  }
}

export const getUserById = async (id: number): Promise<User | null> => {
  const prisma = getDB()

  const userRecord = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, password: true, avatar: true, role: true },
  })

  if (!userRecord) return null

  return {
    id: userRecord.id,
    username: userRecord.username,
    email: userRecord.email || '',
    password: userRecord.password || '',
    avatar: userRecord.avatar,
    role: userRecord.role,
  }
}

type OmitUser = Omit<User,'password'|'role'>

export const getAllUsers = async (): Promise<OmitUser[]> => {
  const prisma = getDB()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      provider: true,
      lastLoginAt: true,
      groupId: true,
    },
    orderBy: { id: 'asc' },
  })

  return users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email || '',
    avatar: u.avatar,
    provider: u.provider || undefined,
    last_login_at: u.lastLoginAt || undefined,
    group_id: u.groupId || 0,
  }))
}

export const createTampAccountOrUpdate = async (
  name: string,
  provider: string,
  providerUserId: number | string,
  avatar?: string,
): Promise<void> => {
  const prisma = getDB()

  const existing = await prisma.user.findFirst({
    where: {
      provider,
      providerId: Number(providerUserId),
    },
  })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        username: name,
        avatar: avatar || null,
        providerId: Number(providerUserId),
        lastLoginAt: new Date().toISOString(),
      },
    })
    return
  }

  await prisma.user.create({
    data: {
      username: name,
      provider,
      providerId: Number(providerUserId),
      avatar: avatar || null,
      lastLoginAt: new Date().toISOString(),
    },
  })
}

export const getSocialAccountsByUserId = async (provider_id: number | string, provider: string): Promise<User | null> => {
  const prisma = getDB()

  const userRecord = await prisma.user.findFirst({
    where: {
      providerId: Number(provider_id),
      provider,
    },
  })

  if (!userRecord) return null

  return {
    id: userRecord.id,
    username: userRecord.username,
    email: userRecord.email || '',
    password: '',
    role: userRecord.role,
    group_id: userRecord.groupId || 0,
    provider: userRecord.provider || undefined,
    provider_id: userRecord.providerId || undefined,
    last_login_at: userRecord.lastLoginAt || undefined,
    avatar: userRecord.avatar,
  }
}

export const updateSocialAccountToken = async (
  id: number,
  accessToken: string,
  refreshToken?: string
): Promise<boolean> => {
  const prisma = getDB()

  try {
    await prisma.user.update({
      where: { id },
      data: {
        provider: accessToken,
        lastLoginAt: new Date().toISOString(),
      },
    })
    return true
  } catch {
    return false
  }
}

export const unlinkSocialAccount = async (userId: number, provider: string): Promise<boolean> => {
  const prisma = getDB()

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        provider: null,
        providerId: null,
      },
    })
    return true
  } catch {
    return false
  }
}

export const deleteSocialAccount = async (id: number): Promise<boolean> => {
  return unlinkSocialAccount(id, '')
}

export { User }
