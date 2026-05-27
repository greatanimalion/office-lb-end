import jwt from 'jsonwebtoken'
import config from '../config/index.js'

interface TokenPayload {
  userId: number
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.auth.jwtSecret) as TokenPayload
}

export const decodeToken = (token: string): TokenPayload | null => {
  const decoded = jwt.decode(token)
  return decoded as TokenPayload | null
}