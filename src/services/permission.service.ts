import { PermissionType } from '../constants/permission'
import { getDB, saveDB } from '../db';
import { Permission, shareType } from '../models/permission'


export const createPermission = async (
  permission: string,
  targetId: number,
  shareType?: shareType
): Promise<{ success: boolean; message?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, message: '数据库未初始化' }
  }
  try {
    db.run(`INSERT INTO permissions (target_id,share_type,permission) 
      VALUES (${targetId}, "${shareType}", "${permission.toString()}")`)
    saveDB()
    return { success: true, message: '权限创建成功' }
  } catch (err) {
    console.error(err)
    return { success: false, message: '创建权限失败' }
  }
}

