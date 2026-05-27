import { Router } from 'express'
import {
  createFolderController,
  getFoldersController,
  updateFolderController,
  deleteFolderController
} from '../controllers/folder.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/', getFoldersController as any)
router.post('/', createFolderController as any)
router.put('/:id', updateFolderController as any)
router.delete('/:id', deleteFolderController as any)

export default router