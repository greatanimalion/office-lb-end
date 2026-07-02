import { getDB } from '../db'
import { numToPermisson, PermissionType } from '../utils/permission'

export interface DocumentAccessResult {
  VIEW: boolean,
  DOWNLOAD: boolean,
  EDIT: boolean,
  DELETE: boolean,
  COMMENT: boolean,
  CHANGE_PERMISSION: boolean,
  SHARE: boolean,
  MAKE_TEMPLATE: boolean,
  UPLOAD_FILE: boolean,
}

function fullAccess(): DocumentAccessResult {
  return {
    VIEW: true,
    DOWNLOAD: true,
    EDIT: true,
    DELETE: true,
    COMMENT: true,
    CHANGE_PERMISSION: true,
    SHARE: true,
    MAKE_TEMPLATE: true,
    UPLOAD_FILE: true,
  }
}

function denyResult(): DocumentAccessResult {
  return {
    VIEW: false,
    DOWNLOAD: false,
    EDIT: false,
    DELETE: false,
    COMMENT: false,
    CHANGE_PERMISSION: false,
    SHARE: false,
    MAKE_TEMPLATE: false,
    UPLOAD_FILE: false,
  }
}

function parsePermissionMask(permissionStr: string): DocumentAccessResult {
  const permNum = parseInt(permissionStr, 10)
  if (isNaN(permNum)) return denyResult()

  const permissions = numToPermisson(permNum)
  console.log(permissions)
  return {
    VIEW: permissions.includes(PermissionType.VIEW),
    DOWNLOAD: permissions.includes(PermissionType.DOWNLOAD),
    EDIT: permissions.includes(PermissionType.EDIT),
    DELETE: permissions.includes(PermissionType.DELETE),
    COMMENT: permissions.includes(PermissionType.COMMENT),
    CHANGE_PERMISSION: permissions.includes(PermissionType.SHARE),
    UPLOAD_FILE: permissions.includes(PermissionType.UPLOAD_FILE),
    SHARE: permissions.includes(PermissionType.SHARE),
    MAKE_TEMPLATE: permissions.includes(PermissionType.MAKE_TEMPLATE),
  }
}

export const checkDocumentAccess = async (
  document: { id: number; ownerId: number; ownerType: string; permission?: string | null },
  userId: number,
  userRole: string
): Promise<DocumentAccessResult> => {
  console.log("=====================权限校验中=======================")
  // 公共文档放行
  if (document.ownerType === 'public') {
    console.log("=====================公共文档=======================")
    return fullAccess()

  }
  // 系统管理员放行
  if (userRole === 'admin') {
    console.log("=====================系统管理员=======================")
    return fullAccess()
  }

  const prisma = getDB()
  // 文档所有者放行
  if (document.ownerType === 'user' && document.ownerId === userId) {
    console.log("=====================文档所有者=======================")
    return fullAccess()
  }
  const permRecord = await prisma.permission.findFirst({
    where: { to_id: userId, target_id: document.id },
  })
  if (permRecord) {
    // 时间校验
    if (permRecord.startTime || permRecord.endTime) {
      const now = new Date()
      if (permRecord.startTime && new Date(permRecord.startTime) > now) {
        console.log("=====================时间未到=======================")
        return denyResult()
      }
      if (permRecord.endTime && new Date(permRecord.endTime) < now) {
        console.log("=====================时间已过期=======================")
        return denyResult()
      }
    }
    // 有限次数校验
    if (permRecord.count !== null && permRecord.count !== undefined) {
      if (permRecord.count <= 0) {
        console.log("=====================次数已用完=======================")
        await prisma.permission.delete({ where: { id: permRecord.id } })
        return denyResult()
      }
      await prisma.permission.update({
        where: { id: permRecord.id },
        data: { count: { decrement: 1 } },
      })
    }
    //剩下的时永久与无限次数
    if (permRecord.permission) {
      console.log("=====================校验权限中=======================")
      return parsePermissionMask(permRecord.permission)
    }
  }
  // 当文档与用户同组时
  if (document.ownerType === 'group') {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: document.ownerId, userId } },
    })
    if (member) {
      console.log("=====================用户是组成员=======================")
      if (member.role === 'owner') {
        console.log("=====================用户是组所有者=======================")
        return fullAccess()
      }
      //查询文档固有权限
      const doc = await prisma.document.findUnique({ where: { id: document.id } })
      if (!doc) return denyResult()
      if (doc.permission) {
        console.log("=====================文档有有权限=======================")
        return parsePermissionMask(doc.permission)
      }
      return fullAccess()
    }
  }
  // 当文档与用户同文件夹时
  if (document.ownerType === 'folder') {
    let folderId = document.ownerId
    const folder = await prisma.folder.findUnique({ where: { id: folderId } })
    if (!folder) return denyResult()
    if (folder.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: folder.groupId, userId } },
      })
      // 当用户是文件夹所属组的成员时
      if (member) {
        //查询文档固有权限
        const doc = await prisma.document.findUnique({ where: { id: document.id } })
        if (!doc) return denyResult()
        if (doc.permission) {
          console.log(152, "=====================文档有有权限=======================")
          return parsePermissionMask(doc.permission)
        }
        return folder.permission
          ? parsePermissionMask(folder.permission)
          : denyResult()
      }
    }
  }
  return denyResult()
}

export const createPermission = async (
  operatorId: number,
  toId: number,
  permission: string,
  targetId: number,
  shareType?: 'user' | 'group' | 'link',
  groupId?: number
): Promise<{ success: boolean; message?: string }> => {
  const prisma = getDB()
  try {
    await prisma.permission.create({
      data: {
        operator_id: operatorId,
        to_id: toId,
        permission,
        target_id: targetId,
        to_type: shareType || null,
        group_id: groupId,
      },
    })
    return { success: true, message: '权限创建成功' }
  } catch (err) {
    console.error(err)
    return { success: false, message: '创建权限失败' }
  }
}
