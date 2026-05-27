interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
  bcryptSaltRounds: number
  jwtCookieName: string
  jwtCookieMaxAge: number
  sessionSecret: string
  sessionMaxAge: number
  gitlab: {
    clientId: string
    clientSecret: string
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

const auth: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  jwtCookieName: process.env.JWT_COOKIE_NAME || 'token',
  jwtCookieMaxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE || '86400000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-key',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
  gitlab: {
    clientId: process.env.GITLAB_CLIENT_ID || '',
    clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITLAB_CALLBACK_URL || 'http://localhost:5000/api/auth/gitlab/callback'
  },
  dingtalk: {
    clientId: process.env.DINGTALK_CLIENT_ID || '',
    clientSecret: process.env.DINGTALK_CLIENT_SECRET || '',
    callbackUrl: process.env.DINGTALK_CALLBACK_URL || 'http://localhost:5000/api/auth/dingtalk/callback'
  },
  wechat: {
    clientId: process.env.WECHAT_CLIENT_ID || '',
    clientSecret: process.env.WECHAT_CLIENT_SECRET || '',
    callbackUrl: process.env.WECHAT_CALLBACK_URL || 'http://localhost:5000/api/auth/wechat/callback'
  }
}

export default auth