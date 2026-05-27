interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
}
import dotenv from 'dotenv'
dotenv.config()
const email: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.qq.com',
  port: parseInt(process.env.EMAIL_PORT || '465', 10),
  user: process.env.EMAIL_USER || 'your_email@qq.com',
  pass: process.env.EMAIL_PASS || 'your_authorization_code',
}

export default email
