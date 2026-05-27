import express, { Router } from 'express'
import {
  getDocumentsController,
  getSharedDocumentsController,
  getDocumentController,
  createDocumentController,
  updateDocumentController,
  deleteDocumentController,
  shareDocumentController,
  unshareDocumentController,
  downloadDocumentController,
  trackDocumentController,
  getDocumentVersionsController,
  restoreDocumentVersionController,
  lockDocumentController,
  unlockDocumentController
} from '../controllers/document.controller.js'
import { authenticate } from '../middlewares/auth.middleware'
import { createUploadMiddleware } from '../middlewares/upload.middleware'
import { auditAction } from '../middlewares/audit.middleware'
import { AuditAction, AuditEntityType } from '../constants/audit'

const router = Router()

router.use(authenticate)

router.get('/', getDocumentsController as any)
router.get('/shared', getSharedDocumentsController as any)
router.get('/:id', getDocumentController as any)
router.post('/', createUploadMiddleware('file'), createDocumentController as any)
router.put('/:id', updateDocumentController as any)
router.delete('/:id', deleteDocumentController as any)
router.post('/:id/share', shareDocumentController as any)
router.delete('/:id/share/:userId', unshareDocumentController as any)
router.get('/:id/download', downloadDocumentController as any)
router.post('/:id/track', trackDocumentController as any)
router.get('/:id/versions', getDocumentVersionsController as any)
router.post('/:id/versions/:version/restore', restoreDocumentVersionController as any)
router.post('/:id/lock', lockDocumentController as any)
router.post('/:id/unlock', unlockDocumentController as any)

export default router