import { type Request, type Response } from 'express'
import { login, register, getAllUsers, getUserById, getSocialAccountsByUserId } from '../services/user.service.js'
import logger from '../utils/logger.js'
import { verifyCode } from '../services/verification.service.js'
import { getUserId } from './group.controller.js'
import { changeGroup } from '../services/group.service.js'


export const getAllUsersController=async (req: Request, res: Response)=>{
  try {
    const users = await getAllUsers()
    res.status(200).json({success:true,message:'获取用户列表成功',user:users})
  } catch (error) {
    logger.error('Get users error:', error)
    res.status(400).json({ message: '获取用户列表失败' })
  }
}

export const loginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {email, password } = req.body
    if (!email || !password) {
      res.status(200).json({ success: false, message: '邮箱和密码不能为空' })
      return
    }
    const result = await login(email, password)
    
    if (!result.success) {
      res.status(200).json(result)
      return
    }
    res.json({
      token: result.token,
      user: result.user
    })
  } catch (error) {
    logger.error('Login error:', error)
    res.status(400).json({success: false, message: '登录失败' })
  }
}

export const registerController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, email, password,code } = req.body

    if (!username || !email || !password||!code) {
      res.status(400).json({ success: false, message: '用户名、邮箱、密码、和验证码不能为空' })
      return
    }
    const verifyResult = await verifyCode(email,code)
    if (!verifyResult.success) {
      res.status(200).json({ success: false, message: verifyResult.message })
      return
    }

    // 注册用户
    const result = await register(username, email, password)

    if (!result.success) {
      res.status(400).json({ success: false, message: result.error })
      return
    }

    res.status(200).json({ success: true, message: '注册成功' })
  } catch (error) {
    logger.error('Register error:', error)
    res.status(500).json({ success: false, message: '注册失败' })
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
      avatar: user.avatar,
      role: user.role
    })
  } catch (error) {
    logger.error('Get user error:', error)
    res.status(400).json({ message: '获取用户信息失败' })
  }
}

export const changeGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { groupId } = req.body
    const userId = getUserId(req)
    if (!groupId) {
      res.status(200).json({ success: false, message: '分组ID不能为空' })
      return
    }
    const result = await changeGroup(userId,groupId)
    if (!result.success) {
      res.status(200).json(result)
      return
    }
    res.json({
      success: true,
      message: '用户分组更新成功'
    })
  } catch (error) {
    logger.error('Change group error:', error)
    res.status(400).json({ success: false, message: '更新用户分组失败' })
  }
}


export const getUserSocialAccountController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //@ts-ignore
    const provide=req.user!.provider;const provider_id=req.user!.provider_id as number
    if(!provide||!provider_id){
      res.status(200).json({success: false, message: '令牌解析失败' })
      return
    }
    const user = await getSocialAccountsByUserId(provider_id, provide)
    res.json({success:true,user:user})
  } catch (error) {
    logger.error('Get social accounts error:', error)
    res.status(400).json({success: false, message: '获取用户社交账号失败' })
  }
}