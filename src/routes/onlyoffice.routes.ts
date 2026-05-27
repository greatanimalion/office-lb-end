import { Router } from 'express'
import {
  getEditorConfigController,
  callbackController
} from '../controllers/onlyoffice.controller'
import { authenticate, optionalAuth } from '../middlewares/auth.middleware'

const router: import('express').Router = Router()

router.get('/:id/config', authenticate, getEditorConfigController)
router.post('/:id/callback', callbackController)

export default router