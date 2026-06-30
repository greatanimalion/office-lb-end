import { getDB } from '../db'
import { type Group } from '../models/group'

export interface CreateGroupOptions {
  name: string
  description?: string | undefined
  ownerId: number
}

export interface GroupMember {
  id: number
  groupId: number
  userId: number
  username: string
  email: string
  role: string
  createdAt: Date
}

export const createGroup = async (options: CreateGroupOptions): Promise<{ success: boolean; id?: number; error?: string }> => {
  const prisma = getDB()
  try {
    const { name, description, ownerId } = options

    const group = await prisma.group.create({
      data: {
        name,
        description: description || '',
        ownerId,
        createdAt: new Date().toLocaleString(),
      },
    })

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: ownerId,
        role: 'owner',
        createdAt: new Date().toLocaleString(),
      },
    })

    return { success: true, id: group.id }
  } catch (err) {
    return { success: false, error: '创建组失败，组名可能已存在' }
  }
}

export const updateGroup = async (
  groupId: number,
  name: string,
  description: string | undefined,
  userId: number
): Promise<{ success: boolean; error?: string }> => {
  const prisma = getDB()

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) {
      return { success: false, error: '组不存在' }
    }

    if (group.ownerId !== userId) {
      return { success: false, error: '只有组管理员可以修改组信息' }
    }

    await prisma.group.update({
      where: { id: groupId },
      data: {
        name,
        ...(description !== undefined ? { description } : {}),
      },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: '更新组失败' }
  }
}

export const deleteGroup = async (
  groupId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> => {
  const prisma = getDB()

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) {
      return { success: false, error: '组不存在' }
    }

    if (group.ownerId !== userId) {
      return { success: false, error: '只有组管理员可以删除组' }
    }

    await prisma.groupMember.deleteMany({ where: { groupId } })
    await prisma.group.delete({ where: { id: groupId } })

    return { success: true }
  } catch (err) {
    return { success: false, error: '删除组失败' }
  }
}

export const getGroupById = async (groupId: number): Promise<Group | null> => {
  const prisma = getDB()

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return null

  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt ? new Date(group.createdAt) : new Date(),
    description: group.description || '',
  }
}

export const getAllGroups = async (userId: number): Promise<Group[]> => {
  const prisma = getDB()

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true },
    orderBy: { group: { createdAt: 'desc' } },
  })

  return memberships.map(m => ({
    id: m.group.id,
    name: m.group.name,
    ownerId: m.group.ownerId,
    createdAt: m.group.createdAt ? new Date(m.group.createdAt) : new Date(),
    description: m.group.description || '',
  }))
}

export const getGroupsByUserId = async (userId: number): Promise<Group[]> => {
  return getAllGroups(userId)
}

export const addMemberToGroup = async (
  groupId: number,
  userId: number,
  role: string = 'member'
): Promise<{ success: boolean; error?: string }> => {
  const prisma = getDB()

  try {
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })

    if (existing) {
      return { success: false, error: '用户已在组中' }
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role,
        createdAt: new Date().toLocaleString(),
      },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: '添加组成员失败' }
  }
}

export const removeMemberFromGroup = async (
  groupId: number,
  userId: number,
  requesterId: number
): Promise<{ success: boolean; error?: string }> => {
  const prisma = getDB()

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) {
      return { success: false, error: '组不存在' }
    }

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })

    if (!member) {
      return { success: false, error: '用户不在组中' }
    }

    if (userId !== requesterId && group.ownerId !== requesterId) {
      return { success: false, error: '无权移除此成员' }
    }

    if (member.role === 'owner') {
      return { success: false, error: '不能移除组管理员' }
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: '移除组成员失败' }
  }
}

export const getGroupMembers = async (groupId: number): Promise<GroupMember[]> => {
  const prisma = getDB()

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })

  return members.map(m => ({
    id: m.id,
    groupId: m.groupId,
    userId: m.userId,
    username: m.user.username,
    email: m.user.email || '',
    role: m.role,
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
  }))
}

export const isGroupOwner = async (groupId: number, userId: number): Promise<boolean> => {
  const prisma = getDB()
  const group = await prisma.group.findFirst({
    where: { id: groupId, ownerId: userId },
  })
  return group !== null
}

export const changeGroup = async (userId: number, groupId: number): Promise<{ success: boolean; message?: string }> => {
  const prisma = getDB()
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { groupId },
    })
    return { success: true }
  } catch (err) {
    console.log(err)
    return { success: false, message: '更新用户分组失败' }
  }
}
