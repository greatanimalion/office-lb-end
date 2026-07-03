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
  recentDocumentController,
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
// 更新文档
router.put('/:id', updateDocumentController as RequestHandler)
//临时删除文档
router.post('/:id/temp', deleteDocumentController as RequestHandler)
// 恢复删除文档
router.post('/:id/recovery', recoverDocumentController as RequestHandler)
// 永久删除文档
router.delete('/:id/forever', deleteDocumentForeverController as RequestHandler)
// router.post('/:id/share', shareDocumentController as RequestHandler)
// router.delete('/:id/share/:userId', unshareDocumentController as RequestHandler)
// router.get('/:id/download', downloadDocumentController as RequestHandler)
// router.post('/:id/track', trackDocumentController as RequestHandler)
// 获取条件所有文档
router.get('/all', getAllDocumentsController as RequestHandler)
//获取组内删除文档
router.get('/:groupId/deleted', getDeleteDocumentsController as RequestHandler)
// 获取文档版本
router.get('/:id/versions', getDocumentVersionsController as RequestHandler)
// 删除文档版本
router.delete('/:id/version', deleteDocumentVersionController as RequestHandler)
// 回滚文档版本
router.post('/revert', revertDocumentVersionController as RequestHandler)
// 锁定文档
router.post('/:id/lock', lockDocumentController as any)
// 解锁文档
router.post('/:id/unlock', unlockDocumentController as any)
// 上传文档到组
router.post('/uploadTo', uploadDocumentController as RequestHandler)
// 记录最近文档
router.get('/recent', recentDocumentController as RequestHandler)



// 初始化上传
router.post('/chunk/init', initUploadController as RequestHandler)
// 上传文件块
router.post('/chunk/upload', chunkUpload.single('chunk'), uploadChunkController as RequestHandler)
// 合并文件块
router.post('/chunk/merge', mergeChunksController as RequestHandler)
// 获取上传进度
router.get('/chunk/progress/:fileId', getUploadProgressController as RequestHandler)
// 取消上传
router.delete('/chunk/cancel/:fileId', cancelUploadController as RequestHandler)
// 获取上传会话列表
router.get('/chunk/sessions', listUploadSessionsController as RequestHandler)
// 验证文件块
router.post('/chunk/verify', verifyChunkController as RequestHandler)

export default router