import { Request, Response, NextFunction } from 'express'

import { getUserById } from '../services/user.service'
import logger from '../utils/logger.js'
import { verifyToken ,type TokenPayload } from '../utils/jwt'

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers['authorization']
  if (!token) {
    res.status(401).json({ error: '访问令牌缺失' })
    return
  }
  try {
    const decoded = verifyToken(token)

    if(Number.isNaN(Number(decoded.userId))) {
      res.status(403).json({ error: '无效的访问令牌' })
      return 
    }

    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      provider: decoded.provider,
      provider_id: decoded.provider_id
    }

    next()
  } catch (error) {
    logger.error('Token verification failed:', error)
    res.status(403).json({ error: '无效的访问令牌' })
  }
}
