import express from 'express'
import passport from 'passport'

import { gitlabCallBackController } from '../controllers/auth.controller'

const router = express.Router()

router.get('/gitlab', passport.authenticate('gitlab', { scope: ['read_user'] }))
router.get(
  '/gitlab/callback',
  passport.authenticate('gitlab'),
  gitlabCallBackController
)

export default router

