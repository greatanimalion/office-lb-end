import { type Request, type Response } from 'express'
import { generateToken } from '../utils/jwt'
import { type User } from '../services/user.service'

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
    console.log(user)
    const token = generateToken({ userId: 0, email: user.email, role: user.role, provider: 'gitlab', provider_id: user.id, username: user.username })
    res.redirect('http://192.168.2.126:30012/login?token='+token)
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
}