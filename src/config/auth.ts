interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
  bcryptSaltRounds: number
  jwtCookieName: string
  jwtCookieMaxAge: number
  sessionSecret: string
  sessionMaxAge: number
  gitlab: {
    URL: string
    clientId: string
    clientSecret: string
    state: string
    callbackUrl: string
  }
  dingtalk: {
    clientId: string
    clientSecret: string
    callbackUrl: string
  }
  wechat: {
    clientId: string
    clientSecret: string
    callbackUrl: string
  }
}
import dotenv from 'dotenv'
dotenv.config()
const auth: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  jwtCookieName: process.env.JWT_COOKIE_NAME || 'token',
  jwtCookieMaxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE || '86400000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-key',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
  gitlab: {
    URL: process.env.GITLAB_URL || 'https://gitlab.com',
    clientId: process.env.GITLAB_APPLICATION_ID || 'gitlab_client_id',
    clientSecret: process.env.GITLAB_SECRET || 'gitlab_client_secret',
    state: process.env.GITLAB_STATE || '9527',
    callbackUrl: process.env.GITLAB_CALLBACK_URL || 'http://localhost:5000/api/oauth/gitlab/callback'
  },
  dingtalk: {
    clientId: process.env.DINGTALK_CLIENT_ID || 'dingtalk_client_id',
    clientSecret: process.env.DINGTALK_CLIENT_SECRET || 'dingtalk_client_secret',
    callbackUrl: process.env.DINGTALK_CALLBACK_URL || 'http://localhost:5000/api/oauth/dingtalk/callback'
  },
  wechat: {
    clientId: process.env.WECHAT_CLIENT_ID || 'wechat_client_id',
    clientSecret: process.env.WECHAT_CLIENT_SECRET || 'wechat_client_secret',
    callbackUrl: process.env.WECHAT_CALLBACK_URL || 'http://localhost:5000/api/oauth/wechat/callback'
  }
}

export default auth
