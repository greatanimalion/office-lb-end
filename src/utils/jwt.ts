import jwt from 'jsonwebtoken'
import config from '../config/index.js'

export interface TokenPayload {
  id?: number
  role: string
  provider?: string
  provider_id?: number
  exp?: number
  iat?: number
}

export const generateToken = (payload: TokenPayload,secret?:string): string => {
  return jwt.sign(payload, secret || config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export const verifyToken = (token: string,secret?:string): TokenPayload => {
  return jwt.verify(token, secret || config.auth.jwtSecret) as TokenPayload
}


