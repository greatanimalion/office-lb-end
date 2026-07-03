import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import {
  getSharedDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocumentTemp,
  deleteDocumentForever,
  recorveyDocument,
  shareDocument,
  unshareDocument,
  trackDocumentUpdate,
  getDocumentVersion,
  restoreDocumentVersion,
  lockDocument,
  unlockDocument,
  getAllDocuments,
  DocumentRelateDV,
  createDocumentVersion,
  deleteDVserion,
  getDeleteDoc
} from '../services/document.service.js'
import logger from '../utils/logger.js'
import { type OwnerType } from '../models/document.js'


const getUserId = (req: Request): number => {
  return (req.user as { id: number })?.id
}
// 恢复删除文档
export const recoverDocumentController=async(req: Request, res: Response)=>{
    try{
        const documentId = parseInt(req.params.id, 10)
        const document = await getDocumentById(documentId)
        if (!document) {
          res.status(200).json({ success: false, message: '文档不存在或无权访问' })
          return
        }
        const result = await recorveyDocument(documentId)
        res.json({ success: result, message:result ? '恢复文档成功':'恢复文档失败' })
    }catch (error) {
        logger.error('Recover document error:', error)
        res.status(500).json({ error: '恢复文档失败' })
    }
}

export const viewDocumentByIdController = async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.documentId, 10)
    const document = await getDocumentById(documentId)
    if (!document) {
      res.status(404).json({ error: '文档不存在或无权访问' })
      return
    }
    res.json(document)
  } catch (error) {
    logger.error('Get document by ID error:', error)
    res.status(500).json({ error: '获取文档信息失败' })
  }
}
// 上传文档
export const uploadDocumentController = async (req: Request, res: Response) => {
  try {
    let { documentId, targetId, owner_type } = req.body
    const userId = getUserId(req)
    const isPublic = owner_type === 'public'
    if (!isPublic) {
      if (!targetId || !documentId || !owner_type) {
        res.status(200).json({ success: false, message: 'ID、文件ID、上传类型不能为空' })
        return
      }
    }
    if (!documentId || !owner_type) {
      res.status(200).json({ success: false, message: '文件ID、上传类型不能为空' })
      return
    }
    const _document = await getDocumentById(documentId)
    if (!_document) {
      res.status(200).json({ success: false, message: '文档不存在或无权访问' })
      return
    }
    const id = await createDocument(
      isPublic ? 0 : Number(targetId),
      owner_type,
      _document.title!,
    )
    const documentVersionId = await createDocumentVersion(
      userId,
      id,
      _document.filepath!,
      _document.fileSize!,
      _document.v_number!,
    )
    DocumentRelateDV(id, documentVersionId)
    if (Number(id)) {
      res.json({ success: true, message: '上传文档到分组成功' })
    } else {
      res.status(200).json({ success: false, message: '上传文档到分组失败' })
    }
  } catch (error) {
    logger.error('Upload document to group error:', error)
    res.status(500).json({ success: false, message: '上传文档到分组失败' })
  }
}
// 获取所有文档
export const getAllDocumentsController = async (
  req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1
  const pageSize = parseInt(req.query.pageSize as string, 10) || 100
  let ownerId = parseInt(req.query.owner_id as string, 10)
  const owner_type = req.query.owner_type as OwnerType
  const filter = req.query.filter as string
  ownerId = owner_type == 'public' ? 0 : ownerId
  if (!ownerId || !owner_type) {
    if (owner_type == 'public') {
      ownerId = 0
    }
    else {
      res.status(200).json({ success: false, message: 'ID、上传类型不能为空' })
      return
    }
  }
  try {
    const documents = await getAllDocuments(page, pageSize, ownerId, owner_type, filter)
    res.json({ success: true, data: documents })
  } catch (error) {
    logger.error('Get all documents error:', error)
    res.status(500).json({ success: false, message: '获取所有文档列表失败' })
  }
}
// 获取回收站文档
export const getDeleteDocumentsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.groupId, 10)
    if(isNaN(groupId)){
      res.status(200).json({success: false, message: '无效的分组ID' })
      return
    }
    const documents = await getDeleteDoc(groupId)
    res.json({ success: true, data: documents })
  } catch (error) {
    logger.error('Get delete documents error:', error)
    res.status(500).json({ success: false, message: '获取回收站文档列表失败' })
  }
}
// 获取共享文档
export const getSharedDocumentsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req)
    const documents = await getSharedDocuments(userId)
    res.json(documents)
  } catch (error) {
    logger.error('Get shared documents error:', error)
    res.status(500).json({ error: '获取共享文档列表失败' })
  }
}
// 下载文档
export const getDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }
    const document = await getDocumentById(documentId)
    if (!document) {
      res.status(404).json({ error: '文档不存在或无权访问' })
      return
    }

    const filePath = document.filepath!
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件不存在' })
      return console.log(filePath)
    }

    const stat = fs.statSync(filePath)
    const contentTypeMap: any = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.pdf': 'application/pdf',
    };
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size.toString())
    const encodedFilename = encodeURIComponent(document.title!||('未命名文件.'+ext))
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`)
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error) {
    logger.error('Get document error:', error)
    res.status(500).json({ error: '获取文档信息失败' })
  }
}
// 创建文档
export const createDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title } = req.body
    const file = req.file
    const userId = getUserId(req)

    if (!file) {
      res.status(400).json({ error: '请上传文件' })
      return
    }
    const documentId = await createDocument(
      userId,
      'user',
      title || file.originalname,
    )

    res.status(201).json({ id: documentId, title: title || file.originalname })
  } catch (error) {
    logger.error('Create document error:', error)
    res.status(500).json({ error: '创建文档失败' })
  }
}
// 更新文档
export const updateDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const { title,permission } = req.body
    const userId = getUserId(req)
    if (isNaN(documentId)) {
      res.status(200).json({ success: false, message: '无效的文档ID' })
      return
    }
    const success = await updateDocument(documentId, title, userId, permission)
    if (!success) {
      res.status(200).json({ success: false, message: '无权修改此文档' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    logger.error('Update document error:', error)
    res.status(500).json({ success: false, message: '更新文档失败' })
  }
}
// 临时删除文档
export const deleteDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const userId = getUserId(req)
    const groupId = Number(req.body.groupId)
    
    console.log(documentId, groupId)
    if (isNaN(documentId)||isNaN(groupId)) {
      res.status(200).json({ success: false, message: '无效的文档ID或组ID' })
      return
    }

    const success = await deleteDocumentTemp(documentId, userId,groupId)

    if (!success) {
      res.status(200).json({ success: false, message: '无权删除此文档' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Delete document error:', error)
    res.status(500).json({ success: false, message: '删除文档失败' })
  }
}
// 永久删除文档
export const deleteDocumentForeverController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const userId = getUserId(req)

    if (isNaN(documentId)) {
      res.status(200).json({ success: false, message: '无效的文档ID' })
      return
    }

    const success = await deleteDocumentForever(documentId, userId)

    if (!success) {
      res.status(200).json({ success: false, message: '无权删除此文档' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Delete document forever error:', error)
    res.status(500).json({ success: false, message: '永久删除文档失败' })
  }
}
// 删除文档版本
export const deleteDocumentVersionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const dvId = parseInt(req.params.id, 10)
    if (isNaN(dvId)) {
      res.status(200).json({ success: false, error: '无效的文档版本ID' })
      return
    }
    const success = deleteDVserion(dvId)
    if (!success) {
      res.status(200).json({ success: false, error: '无权删除此文档版本' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    logger.error('Delete document version error:', error)
    res.status(500).json({ error: '删除文档版本失败' })
  }
}
// 取消分享文档
export const unshareDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const targetUserId = parseInt(req.params.userId, 10)
    const currentUserId = getUserId(req)

    if (isNaN(documentId) || isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的参数' })
      return
    }

    const success = await unshareDocument(documentId, targetUserId, currentUserId)

    if (!success) {
      res.status(403).json({ error: '无权取消分享' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Unshare document error:', error)
    res.status(500).json({ error: '取消分享失败' })
  }
}
// 下载文档
export const downloadDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const userId = getUserId(req)

    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }

    const document = await getDocumentById(documentId)

    if (!document) {
      res.status(404).json({ error: '文档不存在或无权访问' })
      return
    }


    // res.download(document.filepath, document.filename)
  } catch (error) {
    logger.error('Download document error:', error)
    res.status(500).json({ error: '下载文档失败' })
  }
}
// 更新文档跟踪
export const trackDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const userId = getUserId(req)

    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }

    await trackDocumentUpdate(documentId, userId)

    res.json({ success: true })
  } catch (error) {
    logger.error('Track document error:', error)
    res.status(500).json({ error: '更新文档跟踪失败' })
  }
}
// 获取文档版本
export const getDocumentVersionsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    if (isNaN(documentId)) {
      res.status(200).json({ success: false, message: '无效的文档ID' })
      return
    }
    const document = await getDocumentById(documentId)
    if (!document) {
      res.status(200).json({ success: false, message: '文档不存在或无权访问' })
      return
    }
    
    const versions = await getDocumentVersion(documentId)
    res.json({ success: true, data: versions, currentVersion: document.v_number })
  } catch (error) {
    logger.error('Get document versions error:', error)
    res.status(500).json({ success: false, message: '获取文档版本失败' })
  }
}
// 恢复文档版本
export const revertDocumentVersionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { documentId, versionId } = req.body
    const userId = getUserId(req)
    if (isNaN(+documentId) || isNaN(+versionId)) {
      res.status(200).json({ success: false, message: '无效的参数' })
      return
    }

    const success = await restoreDocumentVersion(+documentId, +versionId, userId)

    if (!success) {
      res.status(200).json({ success: false, message: '无权恢复此版本或版本不存在' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    logger.error('Restore document version error:', error)
    res.status(500).json({ success: false, message: '恢复文档版本失败' })
  }
}
// 锁定文档
export const lockDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const userId = getUserId(req)

    if (isNaN(documentId)) {
      res.status(200).json({ success: false, message: '无效的文档ID' })
      return
    }

    const success = await lockDocument(documentId, userId)

    if (!success) {
      res.status(200).json({ success: false, message: '无权锁定此文档或文档已被锁定' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Lock document error:', error)
    res.status(500).json({ success: false, message: '锁定文档失败' })
  }
}
// 解锁文档
export const unlockDocumentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documentId = parseInt(req.params.id, 10)
    const userId = getUserId(req)

    if (isNaN(documentId)) {
      res.status(400).json({ error: '无效的文档ID' })
      return
    }

    const success = await unlockDocument(documentId, userId)

    if (!success) {
      res.status(403).json({ error: '无权解锁此文档' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Unlock document error:', error)
    res.status(500).json({ error: '解锁文档失败' })
  }
}