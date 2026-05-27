import { Router } from 'express'
import {
  getPermissionsController,
  setPermissionController,
  removePermissionController
} from '../controllers/permission.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/:documentId/permissions', getPermissionsController as any)
router.post('/:documentId/permissions', setPermissionController as any)
router.delete('/:documentId/permissions/:userId', removePermissionController as any)

export default router