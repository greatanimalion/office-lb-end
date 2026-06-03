import { Request, Response } from 'express'
import {
  createFolder,
  deleteFolder,
  updateFolderName,
  getFoldersList,
  buildFolderTree
} from '../services/folder'
import logger from '../utils/logger'
import { createPermission } from '../services/permission.service'

const getUserId = (req: Request): number => {
  return (req.user as { id: number })?.id
}

export const createFolderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { filename, parentFolderId, groupId,permission } = req.body
    if (!filename || !groupId||!permission) {
      res.status(400).json({ error: '文件夹名称和组ID不能为空 或 权限字符串不能为空' })
      return
    }
    const result = await createFolder({
      filename,
      parentFolderId,
      groupId
    })

    if(result.success){
      const re=await createPermission(permission,result.id!)
      if(!re.success){
        res.status(400).json({ error: re.message })
        return
      }
    }
    if (!result.success) {
      res.status(400).json({ error: result.error })
      return
    }

    res.status(200).json({ id: result.id, filename, parentFolderId, groupId })
  } catch (error) {
    logger.error('Create folder error:', error)
    res.status(500).json({ error: '创建文件夹失败' })
  }
}


export const getFolderTreeController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.groupId, 10)

    if (isNaN(groupId)) {
      res.status(400).json({ error: '无效的组ID' })
      return
    }

    const folderTree = await buildFolderTree(groupId)
    res.json(folderTree)
  } catch (error) {
    logger.error('Get folder tree error:', error)
    res.status(500).json({ error: '获取文件夹树失败' })
  }
}

export const getFolderListController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {groupId, parentFolderId} = req.query
    if ( isNaN(Number(groupId)) && isNaN(Number(parentFolderId))) {
      res.status(400).json({ success: false, error: '组ID和父文件夹ID不能为空' })
      return
    }
    const folder = await getFoldersList(Number(groupId), Number(parentFolderId))

    res.json({success: true, data: folder})
  } catch (error) {
    logger.error('Get folder with children error:', error)
    res.status(500).json({success: false, error: '获取文件夹详情失败' })
  }
}

export const updateFolderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const folderId = parseInt(req.params.id, 10)
    const { filename } = req.body

    if (isNaN(folderId)) {
      res.status(400).json({ error: '无效的文件夹ID' })
      return
    }

    if (!filename) {
      res.status(400).json({ error: '文件夹名称不能为空' })
      return
    }

    const result = await updateFolderName(folderId, filename)

    if (!result.success) {
      res.status(404).json({ error: result.error })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Update folder error:', error)
    res.status(500).json({ error: '更新文件夹失败' })
  }
}

export const deleteFolderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const folderId = parseInt(req.params.id, 10)

    if (isNaN(folderId)) {
      res.status(200).json({ success: false, error: '无效的文件夹ID' })
      return
    }

    const result = await deleteFolder(folderId)

    if (!result.success) {
      res.status(404).json({ success: false, error: result.error })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Delete folder error:', error)
    res.status(500).json({ success: false, error: '删除文件夹失败' })
  }
}