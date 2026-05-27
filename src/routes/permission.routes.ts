import { Router } from 'express'
import {
  getPermissionsController,
  setPermissionController,
  removePermissionController
} from '../controllers/permission.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router: import('express').Router = Router()

router.use(authenticate)

router.get('/:documentId/permissions', getPermissionsController)
router.post('/:documentId/permissions', setPermissionController)
router.delete('/:documentId/permissions/:userId', removePermissionController)

export default router