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
function publicDocumentAccess(): DocumentAccessResult {
  return {
    VIEW: true,
    DOWNLOAD: true,
    EDIT: false,
    DELETE: false,
    COMMENT: false,
    CHANGE_PERMISSION: false,
    SHARE: false,
    MAKE_TEMPLATE: false,
    UPLOAD_FILE: false,
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
    return publicDocumentAccess()

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
      const now = new Date().getTime()
      if (permRecord.startTime && new Date(permRecord.startTime).getTime() > now) {
        console.log("=====================时间未到，进入下一流程=======================")
      } else if (permRecord.endTime && new Date(permRecord.endTime).getTime() < now) {
        console.log("=====================时间已过期，进入下一流程=======================")
      } else if (permRecord.permission) {
        console.log("=====================校验权限中=======================")
        return parsePermissionMask(permRecord.permission)
      }
    } else if (permRecord.count !== null && permRecord.count !== undefined) {
      if (permRecord.count <= 0) {
        console.log("=====================次数已用完，进入下一流程=======================")
        await prisma.permission.delete({ where: { id: permRecord.id } })
      } else {
        await prisma.permission.update({
          where: { id: permRecord.id },
          data: { count: { decrement: 1 } },
        })
        if (permRecord.permission) {
          console.log("=====================校验权限中=======================")
          //临时权限最高，优先校验临时权限  
          return parsePermissionMask(permRecord.permission)
        }
      }
    } else if (permRecord.permission) {
      console.log("=====================校验权限中=======================")
      return parsePermissionMask(permRecord.permission)
    }
  }
  // 文档归属组，用户是组成员 -> 全部权限
  if (document.ownerType === 'group') {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: document.ownerId, userId } },
    })
    if (member) {
      console.log("=====================文档归属组，用户是组成员=======================")
      if(document.permission){
        return parsePermissionMask(document.permission)
      }
      return fullAccess() //组内首级目录权限默认完全放开，
    }
  }
  // 文档归属文件夹
  if (document.ownerType === 'folder') {
    let folderId = document.ownerId
    const folder = await prisma.folder.findUnique({ where: { id: folderId } })
    if (!folder) return denyResult()
    if (folder.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: folder.groupId, userId } },
      })
      if (member) {
        // 组所有者 -> 全部权限
        if (member.role === 'owner') {
          console.log("=====================用户是组所有者=======================")
          return fullAccess()
        }
        // 查询文档固有权限
        const doc = await prisma.document.findUnique({ where: { id: document.id } })
        if (!doc) return denyResult()
        if (doc.permission) {
          console.log("=====================文档有权限=======================")
          return parsePermissionMask(doc.permission)
        }
        if (folder.permission) {
          console.log("=====================文件夹有权限=======================")
          return parsePermissionMask(folder.permission)
        }
        return denyResult()
      }
    }
  }
  return denyResult()
}

export const getPermissionsForDocument = async (
  documentId: number
): Promise<any[]> => {
  const prisma = getDB()
  const perms = await prisma.permission.findMany({
    where: { target_id: documentId },
    orderBy: { createdAt: 'desc' },
  })
  return perms
}

export const deletePermission = async (
  toId: number,
  targetId: number
): Promise<boolean> => {
  const prisma = getDB()
  const result = await prisma.permission.deleteMany({
    where: { to_id: toId, target_id: targetId },
  })
  return result.count > 0
}

export const createPermission = async (
  toType: string,
  operatorId: number,
  toId: number,
  targetId: number,
  permission: string,
  startTime: string,
  endTime: string,
  password: string,
  count: number,
  createdAt: number,
  groupId: number
): Promise<{ success: boolean; message?: string|number }> => {
  const prisma = getDB()
  try {
    const result = await prisma.permission.create({
      data: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        password,
        count,
        createdAt: new Date(createdAt).toISOString(),
        group_id: groupId,
        to_type: toType,
        operator_id: operatorId,
        to_id: toId,
        permission,
        target_id: targetId,
      },
    })
    if(!result.permission) return { success: false, message: '创建权限失败' }
    return { success: true, message: result.id }
  } catch (err) {
    console.error(err)
    return { success: false, message: '创建权限失败' }
  }
}
