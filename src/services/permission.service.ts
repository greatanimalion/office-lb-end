import { PermissionType } from '../constants/permission'
import { getDB } from '../db'
import type { Permission, shareType } from '../models/permission'

export const createPermission = async (
  permission: string,
  targetId: number,
  shareType?: shareType
): Promise<{ success: boolean; message?: string }> => {
  const prisma = getDB()
  try {
    await prisma.permission.create({
      data: {
        targetId,
        operatorType: shareType || null,
        permission,
      },
    })
    return { success: true, message: '权限创建成功' }
  } catch (err) {
    console.error(err)
    return { success: false, message: '创建权限失败' }
  }
}
