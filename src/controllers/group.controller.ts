import { Request, Response } from 'express'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupById,
  getAllGroups,
  getGroupsByUserId,
  addMemberToGroup,
  removeMemberFromGroup,
  getGroupMembers,
  isGroupOwner
} from '../services/group.service'
import logger from '../utils/logger'

export const getUserId = (req: Request): number => {
  return (req.user as { id: number })?.id
}

export const createGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description } = req.body
    const userId = getUserId(req)
    if (!name) {
      res.status(200).json({ error: '组名不能为空' })
      return
    }
    const result = await createGroup({
      name,
      ownerId: userId,
      description
    })
    if (!result.success) {
      res.status(400).json({ error: result.error })
      return
    }
    res.status(201).json({ id: result.id, name, description })
  } catch (error) {
    logger.error('Create group error:', error)
    res.status(500).json({ error: '创建组失败' })
  }
}

export const updateGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.id, 10)
    const { name, description } = req.body
    const userId = getUserId(req)

    if (isNaN(groupId)) {
      res.status(400).json({ error: '无效的组ID' })
      return
    }

    if (!name) {
      res.status(400).json({ error: '组名不能为空' })
      return
    }

    const result = await updateGroup(groupId, name, description, userId)

    if (!result.success) {
      res.status(403).json({ error: result.error })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Update group error:', error)
    res.status(500).json({ error: '更新组失败' })
  }
}

export const deleteGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.id, 10)
    const userId = getUserId(req)

    if (isNaN(groupId)) {
      res.status(400).json({ error: '无效的组ID' })
      return
    }

    const result = await deleteGroup(groupId, userId)

    if (!result.success) {
      res.status(403).json({ error: result.error })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Delete group error:', error)
    res.status(500).json({ error: '删除组失败' })
  }
}


export const getAllGroupsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req)
  try {
    const groups = await getAllGroups(userId)
    res.json(groups)
  } catch (error) {
    logger.error('Get all groups error:', error)
    res.status(500).json({ error: '获取组列表失败' })
  }
}


export const addMemberController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.id, 10)
    const { userId, role } = req.body
    const requesterId = getUserId(req)

    if (isNaN(groupId)) {
      res.status(400).json({ error: '无效的组ID' })
      return
    }

    if (!userId) {
      res.status(400).json({ error: '用户ID不能为空' })
      return
    }

    const isOwner = await isGroupOwner(groupId, requesterId)
    if (!isOwner) {
      res.status(403).json({ error: '只有组管理员可以添加成员' })
      return
    }

    const result = await addMemberToGroup(groupId, userId, role || 'member')

    if (!result.success) {
      res.status(400).json({ error: result.error })
      return
    }

    res.status(201).json({ success: true })
  } catch (error) {
    logger.error('Add member error:', error)
    res.status(500).json({ error: '添加成员失败' })
  }
}

export const removeMemberController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.id, 10)
    const userId = parseInt(req.params.userId, 10)
    const requesterId = getUserId(req)

    if (isNaN(groupId) || isNaN(userId)) {
      res.status(400).json({ error: '无效的参数' })
      return
    }

    const result = await removeMemberFromGroup(groupId, userId, requesterId)

    if (!result.success) {
      res.status(403).json({ error: result.error })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Remove member error:', error)
    res.status(500).json({ error: '移除成员失败' })
  }
}

export const getMembersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.id, 10)
    if (isNaN(groupId)) {
      res.status(400).json({ error: '无效的组ID' })
      return
    }
    const members = await getGroupMembers(groupId)
    res.json(members)
  } catch (error) {
    logger.error('Get members error:', error)
    res.status(500).json({ error: '获取组成员失败' })
  }
}