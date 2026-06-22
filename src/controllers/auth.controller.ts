import { type Request, type Response } from 'express'
import { generateToken } from '../utils/jwt'
import { getSocialAccountsByUserId, type User } from '../services/user.service'

export const gitlabCallBackController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as User | undefined
    if (!user) {
      res.status(401).json({ success: false, message: 'GitLab 认证失败' })
      return
    }
    const _user = await getSocialAccountsByUserId(user.id, 'gitlab')
    if (!_user) {
      res.status(401).json({ success: false, message: '账号不存在' })
      return
    }
    const token = generateToken({
      id: _user.id,
      provider: _user.provider, 
      provider_id: _user.provider_id,
      role: _user.role,
    })
    console.log(_user)
    res.redirect('http://192.168.2.126:30012/login?token=' + token)
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ success: false, error: '登录失败' })
  }
}