import passport from 'passport'
import { Strategy as GitLabStrategy } from 'passport-gitlab2'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import config from './auth.js'
import {createTampAccountOrUpdate, User } from '../services/user.service'
import logger from '../utils/logger.js'
import dotenv from 'dotenv'
dotenv.config()
passport.serializeUser((user: Express.User, done) => {
  const u = user as User
  done(null, u.id)
})

passport.deserializeUser(async (id: number, done) => {
  try {
    // const user = await getUserById(id)
    // done(null, user || undefined)
    done(null, id)
  } catch (error) {
    done(error, undefined)
  }
})

passport.use(new GitLabStrategy({
  clientID: config.gitlab.clientId,
  clientSecret: config.gitlab.clientSecret,
  callbackURL: config.gitlab.callbackUrl,
  baseURL: 'http://192.168.0.106/',
}, async (
  _accessToken: string,
  _refreshToken: string,
  profile: any,
  done: (arg0: Error | null, arg1: User | null) => void) => {
  try {
    if(profile)await createTampAccountOrUpdate(
      profile.displayName,
      profile.provider,
      profile.id,
      profile.avatarUrl,
    )
    done(null, profile)
  } catch (error) {
    logger.error('GitLab OAuth error:', error)
    done(error as Error, null)
  }
}))



export default passport
