import { Request, Response } from 'express'
import { login, register, getAllUsers, getUserById } from '../services/user.service.js'
import logger from '../utils/logger.js'
import { verifyCode } from '../services/verification.service.js'

export const loginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ message: '邮箱和密码不能为空' })
      return
    }
    const result = await login(email, password)

    if (!result.success) {
      res.status(401).json({ message: result.error })
      return
    }

    res.json({
      token: result.token,
      user: result.user
    })
  } catch (error) {
    logger.error('Login error:', error)
    res.status(400).json({ message: '登录失败' })
  }
}

export const registerController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, email, password,code } = req.body

    if (!username || !email || !password||!code) {
      res.status(400).json({ message: '用户名、邮箱、密码、和验证码不能为空' })
      return
    }
    const verifyResult = await verifyCode(email,code)
    if (!verifyResult.success) {
      res.status(400).json({ message: verifyResult.message })
      return
    }

    // 注册用户
    const result = await register(username, email, password)

    if (!result.success) {
      res.status(400).json({ message: result.error })
      return
    }
    res.status(200).json({ message: '注册成功' })
  } catch (error) {
    logger.error('Register error:', error)
    res.status(500).json({ message: '注册失败' })
  }
}

export const getUsersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await getAllUsers()
    res.json(users)
  } catch (error) {
    logger.error('Get users error:', error)
    res.status(400).json({ message: '获取用户列表失败' })
  }
}

export const getUserByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户ID' })
      return
    }

    const user = await getUserById(userId)

    if (!user) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })
  } catch (error) {
    logger.error('Get user error:', error)
    res.status(400).json({ message: '获取用户信息失败' })
  }
}