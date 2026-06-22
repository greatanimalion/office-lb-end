import { Router } from 'express'
import {
  getEditorConfigController,
  callbackController
} from '../controllers/onlyoffice.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.get('/:documentId/config', authenticate, getEditorConfigController as any)
router.post('/:documentId/callback', callbackController as any)

export default router