import passport from 'passport'
import { Strategy as GitLabStrategy } from 'passport-gitlab2'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import config from './auth.js'
import { createOrGetUser, User } from '../services/user.service'
import logger from '../utils/logger.js'

passport.serializeUser((user: Express.User, done) => {
  const u = user as User
  done(null, u.id)
})

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await getUserById(id)
    done(null, user || undefined)
  } catch (error) {
    done(error, undefined)
  }
})

passport.use(new GitLabStrategy({
  clientID: config.gitlab.clientId,
  clientSecret: config.gitlab.clientSecret,
  callbackURL: config.gitlab.callbackUrl,
  scope: ['read_user', 'openid', 'profile', 'email']
}, async (accessToken: string, refreshToken: string, profile: { username: any; displayName: any; id: { toString: () => any }; emails: { value: any }[] }, done: (arg0: Error | null, arg1: User | null) => void) => {
  try {
    const user = await createOrGetUser({
      username: profile.username || profile.displayName || profile.id.toString(),
      email: profile.emails?.[0]?.value || `${profile.id}@gitlab.com`,
      role: 'user',
      provider: 'gitlab',
      providerId: profile.id.toString()
    })
    done(null, user)
  } catch (error) {
    logger.error('GitLab OAuth error:', error)
    done(error as Error, null)
  }
}))

passport.use('dingtalk', new OAuth2Strategy({
  authorizationURL: 'https://login.dingtalk.com/oauth2/auth',
  tokenURL: 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken',
  clientID: config.dingtalk.clientId,
  clientSecret: config.dingtalk.clientSecret,
  callbackURL: config.dingtalk.callbackUrl,
  scope: 'openid',
  state: true
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    const user = await createOrGetUser({
      username: params?.openid || params?.unionid || 'dingtalk_user',
      email: `${params?.openid}@dingtalk.com`,
      role: 'user',
      provider: 'dingtalk',
      providerId: params?.openid || params?.unionid || ''
    })
    done(null, user)
  } catch (error) {
    logger.error('DingTalk OAuth error:', error)
    done(error as Error)
  }
}))

passport.use('wechat', new OAuth2Strategy({
  authorizationURL: 'https://open.weixin.qq.com/connect/qrconnect',
  tokenURL: 'https://api.weixin.qq.com/sns/oauth2/access_token',
  clientID: config.wechat.clientId,
  clientSecret: config.wechat.clientSecret,
  callbackURL: config.wechat.callbackUrl,
  scope: 'snsapi_login',
  state: true
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    const user = await createOrGetUser({
      username: params?.openid || 'wechat_user',
      email: `${params?.openid}@wechat.com`,
      role: 'user',
      provider: 'wechat',
      providerId: params?.openid || ''
    })
    done(null, user)
  } catch (error) {
    logger.error('WeChat OAuth error:', error)
    done(error as Error)
  }
}))

export default passport

async function getUserById(id: number): Promise<User | null> {
  const db = await import('../db.js').then(m => m.getDB())
  if (!db) return null
  
  const result = db.exec(`SELECT * FROM users WHERE id = ?`, [id])
  if (result.length === 0) return null
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    username: row[1] as string,
    email: row[2] as string,
    password: row[3] as string,
    role: row[4] as string
  }
}