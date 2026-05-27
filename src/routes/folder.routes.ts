import { Router } from 'express'
import {
  createFolderController,
  getFoldersController,
  updateFolderController,
  deleteFolderController
} from '../controllers/folder.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router: import('express').Router = Router()

router.use(authenticate)

router.get('/', getFoldersController)
router.post('/', createFolderController)
router.put('/:id', updateFolderController)
router.delete('/:id', deleteFolderController)

export default router