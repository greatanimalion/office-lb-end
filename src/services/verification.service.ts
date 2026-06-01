import crypto from 'crypto'
import { createClient, RedisClientType } from 'redis'
import nodemailer, { Transporter } from 'nodemailer'
import redisConfig from '../config/redis'
import emailConfig from '../config/email'
import logger from '../utils/logger'

export interface VerificationCode {
  code: string
  type: string
  target: string
  expiresAt: Date
  createdAt: Date
}

const CODE_EXPIRE_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60

let redisClient: RedisClientType | null = null
let emailTransporter: Transporter | null = null

const initRedis = async (): Promise<void> => {
  if (redisClient) return
  try {
    redisClient = createClient({
      url: `redis://${redisConfig.password ? `${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`
    })
    await redisClient.connect()
    logger.info('Redis connected successfully')
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    redisClient = null
  }
}

const initEmailTransporter = (): void => {
  if (emailTransporter) return
  emailTransporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.port === 465,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass
    }
  })
}

const generateCode = (): string => {
  return crypto.randomInt(100000, 999999).toString()
}

const getRedisKey = (target: string): string => {
  return `verification:${target}`
}

export const generateVerificationCode = async (
  target: string
): Promise<{
  success: boolean,
  message?: string,
}> => {
  await initRedis()
  initEmailTransporter()
  if (!redisClient) {
    return {
      success: false,
      message: 'Redis未连接'
    }
  }
  const code = generateCode()
  const key = getRedisKey(target)
  const expiresInSeconds = CODE_EXPIRE_MINUTES * 60

  const existingCode = await redisClient.get(key)
  if (existingCode) {
    const [, createdAtStr] = existingCode.split(':')
    const createdAt = parseInt(createdAtStr, 10)
    const timeSinceCreation = Date.now() - createdAt
    if (timeSinceCreation < RESEND_COOLDOWN_SECONDS * 1000) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - timeSinceCreation) / 1000)
      return {
        success: false,
        message: `请在 ${remainingSeconds} 秒后重试`
      }
    }
  }
  await redisClient.setEx(key, expiresInSeconds, code)
  if (emailTransporter) {
    try {
      await emailTransporter.sendMail({
        from: `"OFFFICEONLY-to" <${emailConfig.user}>`,
        to: target,
        subject: '验证码',
        text: `您的验证码是: ${code}，有效期${CODE_EXPIRE_MINUTES}分钟。`,
        html: `<p>您的验证码是: <strong>${code}</strong></p><p>有效期${CODE_EXPIRE_MINUTES}分钟。</p>`
      })
      logger.info(`Verification code sent via email to: ${target}  code:${code}`)
    } catch (error) {
      logger.error('Failed to send email:', error)
      await redisClient.del(key)
      return {
        success: false,
        message: '发送邮件失败'
      }
    }
  }
  return {
    success: true,
    message: '验证码发送成功'
  } 
}

export const verifyCode = async (
  email: string,
  code: string
): Promise<{
  success: boolean,
  message?: string,
}> => {
  try {
    await initRedis()
    if (!redisClient) {
      return {
        success: false,
        message: 'Redis未连接'
      }
    }
    console.log(`==email`, email)
    const key = getRedisKey(email)
    const storedValue = await redisClient.get(key)
    if (!storedValue) {
      return {
        success: false,
        message: '验证码不存在或已过期'
      }
    }
    const [storedCode] = storedValue.split(':')
    if (storedCode !== code) {
      return {
        success: false,
        message: '验证码错误'
      }
    }
    await redisClient.del(key)
    return {
      success: true,
      message: '验证码验证成功'
    }
  } catch (error) {
    logger.error('Verify code error:', error)
    return { success: false, message: '验证码验证失败' }
  } finally {
    await disconnectRedis()
  }
}
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}