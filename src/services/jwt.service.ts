import jwt from 'jsonwebtoken'
import config from '../config/index'

export interface TokenPayload {
  userId: number
  role: string
}

const jwtSecret = config.auth.jwtSecret as jwt.Secret
const expiresIn = config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn']

export const generateToken = (userId: number, role: string): string => {
  const payload: TokenPayload = {
    userId,
    role
  }
  
  return jwt.sign(payload, jwtSecret, { expiresIn })
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}