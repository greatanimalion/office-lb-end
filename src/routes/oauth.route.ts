import express from 'express'
import passport from 'passport'
import { generateToken } from '../services/jwt.service'
import { getUserById } from '../services/user.service'
import { User } from '../db'

const router = express.Router()

router.get('/gitlab', passport.authenticate('gitlab', { scope: ['read_user', 'openid', 'profile', 'email'] }))

router.get(
  '/gitlab/callback',
  passport.authenticate('gitlab', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: '认证失败' })
      }

      const user = await getUserById((req.user as User).id)
      if (!user) {
        return res.status(401).json({ message: '用户不存在' })
      }

      const token = generateToken(user.id, user.role)
      res.redirect(`/api/auth/callback?token=${token}`)
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }
)

router.get('/dingtalk', passport.authenticate('dingtalk'))

router.get(
  '/dingtalk/callback',
  passport.authenticate('dingtalk', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: '认证失败' })
      }

      const user = await getUserById((req.user as User).id)
      if (!user) {
        return res.status(401).json({ message: '用户不存在' })
      }

      const token = generateToken(user.id, user.role)
      res.redirect(`/api/auth/callback?token=${token}`)
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }
)

router.get('/wechat', passport.authenticate('wechat'))

router.get(
  '/wechat/callback',
  passport.authenticate('wechat', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: '认证失败' })
      }
      const user = await getUserById((req.user as User).id)
      if (!user) {
        return res.status(401).json({ message: '用户不存在' })
      }
      const token = generateToken(user.id, user.role)
      res.redirect(`/api/auth/callback?token=${token}`)
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }
)

router.get('/callback', (req, res) => {
  const { token } = req.query
  res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${token}' }, '*');
          window.close();
        </script>
      </body>
    </html>
  `)
})

export default router