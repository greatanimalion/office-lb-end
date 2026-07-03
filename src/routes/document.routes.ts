import { RequestHandler, Router } from 'express'
import multer from 'multer'
import {
  getSharedDocumentsController,
  getDocumentController,
  createDocumentController,
  updateDocumentController,
  deleteDocumentController,
  unshareDocumentController,
  downloadDocumentController,
  trackDocumentController,
  getDocumentVersionsController,
  revertDocumentVersionController,
  lockDocumentController,
  unlockDocumentController,
  viewDocumentByIdController,
  getAllDocumentsController,
  uploadDocumentController,
  deleteDocumentVersionController,
  deleteDocumentForeverController,
  getDeleteDocumentsController,
  recoverDocumentController,
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

// 下载
router.get('/d/:id', getDocumentController as RequestHandler)

router.use(authenticate)
router.get('/view', viewDocumentByIdController as RequestHandler)
router.get('/shared', getSharedDocumentsController as RequestHandler)
router.post('/create', createUploadMiddleware('file'), createDocumentController as RequestHandler)
router.put('/:id', updateDocumentController as RequestHandler)
router.post('/:id/temp', deleteDocumentController as RequestHandler)
// 恢复删除文档
router.post('/:id/recovery', recoverDocumentController as RequestHandler)
router.delete('/:id/forever', deleteDocumentForeverController as RequestHandler)
// router.post('/:id/share', shareDocumentController as RequestHandler)
// router.delete('/:id/share/:userId', unshareDocumentController as RequestHandler)
// router.get('/:id/download', downloadDocumentController as RequestHandler)
// router.post('/:id/track', trackDocumentController as RequestHandler)
router.get('/all', getAllDocumentsController as RequestHandler)
router.get('/:groupId/deleted', getDeleteDocumentsController as RequestHandler)
router.get('/:id/versions', getDocumentVersionsController as RequestHandler)
router.delete('/:id/version', deleteDocumentVersionController as RequestHandler)
router.post('/revert', revertDocumentVersionController as RequestHandler)
router.post('/:id/lock', lockDocumentController as any)
router.post('/:id/unlock', unlockDocumentController as any)
router.post('/uploadTo', uploadDocumentController as RequestHandler)



router.post('/chunk/init', initUploadController as RequestHandler)
router.post('/chunk/upload', chunkUpload.single('chunk'), uploadChunkController as RequestHandler)
router.post('/chunk/merge', mergeChunksController as RequestHandler)
router.get('/chunk/progress/:fileId', getUploadProgressController as RequestHandler)
router.delete('/chunk/cancel/:fileId', cancelUploadController as RequestHandler)
router.get('/chunk/sessions', listUploadSessionsController as RequestHandler)
router.post('/chunk/verify', verifyChunkController as RequestHandler)

export default router