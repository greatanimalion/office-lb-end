import { getDB } from '../db'
import { type Folder } from '../models/types'

export interface CreateFolderOptions {
  filename: string
  parentFolderId?: number
  groupId: number,
  permission?: string
}

export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[]
  documents?: { id: number; title: string; filename: string; createdAt: Date }[]
}

export const createFolder = async (options: CreateFolderOptions): Promise<{ success: boolean; id?: number; error?: string }> => {
  const prisma = getDB()
  try {
    const { filename, parentFolderId, groupId, permission } = options

    if (parentFolderId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentFolderId, groupId },
      })
      if (!parent) {
        return { success: false, error: '父文件夹不存在或不属于该组' }
      }
    }

    const folder = await prisma.folder.create({
      data: {
        filename,
        parentFolderId: parentFolderId || null,
        groupId,
        permission: permission || '',
      },
    })

    return { success: true, id: folder.id }
  } catch (err) {
    console.error(err)
    return { success: false, error: '创建文件夹失败' }
  }
}

export const deleteFolder = async (folderId: number): Promise<{ success: boolean; error?: string }> => {
  const prisma = getDB()
  try {
    const deleteChildrenRecursive = async (id: number): Promise<void> => {
      const children = await prisma.folder.findMany({ where: { parentFolderId: id } })
      for (const child of children) {
        await deleteChildrenRecursive(child.id)
      }
      await prisma.folder.delete({ where: { id } })
    }

    await deleteChildrenRecursive(folderId)

    return { success: true }
  } catch (err) {
    return { success: false, error: '删除文件夹失败' }
  }
}

export const updateFolderName = async (folderId: number, newName: string, newPermission: string): Promise<{ success: boolean; error?: string }> => {
  const prisma = getDB()

  try {
    const existing = await prisma.folder.findUnique({ where: { id: folderId } })
    if (!existing) {
      return { success: false, error: '文件夹不存在' }
    }

    await prisma.folder.update({
      where: { id: folderId },
      data: {
        filename: newName,
        permission: newPermission,
      },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: '更新文件夹名称失败' }
  }
}

export const getFoldersList = async (groupId?: number, parentFolderId?: number): Promise<Folder[]> => {
  const prisma = getDB()

  const where: Record<string, unknown> = {}

  if (groupId && !parentFolderId) {
    where.groupId = groupId
    where.parentFolderId = null
  } else if (!groupId && parentFolderId) {
    where.parentFolderId = parentFolderId
  } else if (groupId && parentFolderId) {
    where.groupId = groupId
    where.parentFolderId = parentFolderId
  } else {
    return []
  }

  const folders = await prisma.folder.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })

  return folders.map(f => ({
    id: f.id,
    filename: f.filename,
    parentFolderId: f.parentFolderId || undefined,
    groupId: f.groupId,
    permission: f.permission || undefined,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }))
}

export const buildFolderTree = async (groupId: number): Promise<FolderWithChildren[]> => {
  const rootFolders = await getFoldersList(groupId)

  const allFolders = await getFoldersList(groupId, undefined)

  const buildTree = (folder: Folder): FolderWithChildren => {
    const children = allFolders.filter(f => f.parentFolderId === folder.id)
    return {
      ...folder,
      children: children.length > 0 ? children.map(buildTree) : undefined,
    }
  }

  return rootFolders.map(buildTree)
}
