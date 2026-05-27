import { Request, Response } from 'express'
import {generateVerificationCode} from '../services/verification.service'
import logger from '../utils/logger'

export const sendVerificationCodeController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body
        if (!email) {
            res.status(400).json({ error: '缺少必目标邮箱' })
            return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            res.status(400).json({ error: '无效的邮箱格式' })
            return
        }
        const _res=await generateVerificationCode(email)
        logger.info(`Verification code sent:email -> ${email}`)
        res.json({
            success: true,
            message: _res,
        })
    } catch (error) {
        logger.error('Send verification code error:', error)
        res.status(500).json({ error: '发送验证码失败' })
    }
}

