import  { Router } from 'express'
import multer from 'multer'
import {
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
  unlockDocumentController,
  viewDocumentByIdController,
  getAllMyDocumentsController,
  uploadDocumentToGroupController,
} from '../controllers/document.controller'
import {
  initUploadController,
  uploadChunkController,
  mergeChunksController,
  getUploadProgressController,
  cancelUploadController,
  listUploadSessionsController,
  verifyChunkController
} from '../controllers/chunk.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { createUploadMiddleware } from '../middlewares/upload.middleware'
const router = Router()
const chunkStorage = multer.memoryStorage()
const chunkUpload = multer({ storage: chunkStorage })


router.get('/d/:id', getDocumentController as any)

router.use(authenticate)
router.get('/view', viewDocumentByIdController as any)
router.get('/shared', getSharedDocumentsController as any)
router.post('/create', createUploadMiddleware('file'), createDocumentController as any)
router.put('/:id', updateDocumentController as any)
router.delete('/:id', deleteDocumentController as any)
router.post('/:id/share', shareDocumentController as any)
router.delete('/:id/share/:userId', unshareDocumentController as any)
router.get('/:id/download', downloadDocumentController as any)
router.post('/:id/track', trackDocumentController as any)
router.get('/all', getAllMyDocumentsController as any)
router.get('/:id/versions', getDocumentVersionsController as any)
router.post('/:id/versions/:version/restore', restoreDocumentVersionController as any)
router.post('/:id/lock', lockDocumentController as any)
router.post('/:id/unlock', unlockDocumentController as any)
router.post('/uploadToGroup', uploadDocumentToGroupController as any)



router.post('/chunk/init', initUploadController as any)
router.post('/chunk/upload', chunkUpload.single('chunk'), uploadChunkController as any)
router.post('/chunk/merge', mergeChunksController as any)
router.get('/chunk/progress/:fileId', getUploadProgressController as any)
router.delete('/chunk/cancel/:fileId', cancelUploadController as any)
router.get('/chunk/sessions', listUploadSessionsController as any)
router.post('/chunk/verify', verifyChunkController as any)

export default router