import { Router } from 'express'
import {
  getEditorConfigController,
  callbackController
} from '../controllers/onlyoffice.controller'
import { authenticate, optionalAuth } from '../middlewares/auth.middleware'

const router = Router()

router.get('/:id/config', authenticate, getEditorConfigController as any)
router.post('/:id/callback', callbackController as any)

export default router