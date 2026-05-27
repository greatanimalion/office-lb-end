import { Router } from 'express'
import { getAuditLogsController } from '../controllers/audit.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.get('/', authenticate, getAuditLogsController as any)

export default router