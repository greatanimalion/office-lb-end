import { getDB, saveDB } from '../db'
import {type  Group } from '../models/group'
import logger from '../utils/logger'
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
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }
  try {
    const { name, description, ownerId } = options

    db.run(
      `INSERT INTO groups (name, description, owner_id, created_at) VALUES ("${name}", "${description || ''}", ${ownerId}, "${new Date().toLocaleString()}")`
    )

    const lastIdResult = db.exec('SELECT last_insert_rowid()')
    const lastId = lastIdResult[0].values[0][0] as number

    db.run(
      `INSERT INTO group_members (group_id, user_id, role, created_at) VALUES (${lastId}, ${ownerId}, 'owner', "${new Date().toLocaleString()}")`
    )
    saveDB()

    return { success: true, id: lastId }
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
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }

  try {
        const groupResult = db.exec(`SELECT owner_id FROM groups WHERE id = ${groupId}`)
    if (!groupResult.length || !groupResult[0].values.length) {
      return { success: false, error: '组不存在' }
    }

    const ownerId = groupResult[0].values[0][0] as number
    if (ownerId !== userId) {
      return { success: false, error: '只有组管理员可以修改组信息' }
    }

    if (description !== undefined) {
      db.run(`UPDATE \`groups\` SET name = "${name}", description = "${description}", updated_at = CURRENT_TIMESTAMP WHERE id = ${groupId}`)
    } else {
      db.run(`UPDATE \`groups\` SET name = "${name}", updated_at = CURRENT_TIMESTAMP WHERE id = ${groupId}`)
    }

    saveDB()

    return { success: true }
  } catch (err) {
    return { success: false, error: '更新组失败' }
  }
}

export const deleteGroup = async (
  groupId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }
  try {
        const groupResult = db.exec(`SELECT owner_id FROM groups WHERE id = ${groupId}`)
    if (!groupResult.length || !groupResult[0].values.length) {
      return { success: false, error: '组不存在' }
    }

    const ownerId = groupResult[0].values[0][0] as number
    if (ownerId !== userId) {
      return { success: false, error: '只有组管理员可以删除组' }
    }

    db.run(`DELETE FROM group_members WHERE group_id = ${groupId}`)
    db.run(`DELETE FROM \`groups\` WHERE id = ${groupId}`)

    saveDB()

    return { success: true }
  } catch (err) {
    return { success: false, error: '删除组失败' }
  }
}

export const getGroupById = async (groupId: number): Promise<Group | null> => {
  const db = getDB()
  if (!db) {
    return null
  }

  const result = db.exec(`SELECT * FROM \`groups\` WHERE id = ${groupId}`)

  if (!result.length || !result[0].values.length) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    name: row[1] as string,
    ownerId: row[3] as number,
    createdAt: new Date(row[4] as string),
    description: row[5] as string
  }
}

export const getAllGroups = async (userId: number): Promise<Group[]> => {
  const db = getDB()
  if (!db) {
    return []
  }

  const result = db.exec(`SELECT * FROM groups ORDER BY created_at DESC`)
  const groups: Group[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      groups.push({
        id: row[0] as number,
        name: row[1] as string,
        ownerId: row[2] as number,
        createdAt: new Date(row[3] as string),
        description: row[4] as string
      })
    })
  }

  return groups
}

export const getGroupsByUserId = async (userId: number): Promise<Group[]> => {
  const db = getDB()
  if (!db) {
    return []
  }

  const result = db.exec(`
    SELECT g.* FROM groups g
    INNER JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ${userId}
    ORDER BY g.created_at DESC
  `)
  const groups: Group[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      groups.push({
        id: row[0] as number,
        name: row[1] as string,
        ownerId: row[2] as number,
        createdAt: new Date(row[3] as string),
        description: row[4] as string
      })
    })
  }

  return groups
}

export const addMemberToGroup = async (
  groupId: number,
  userId: number,
  role: string = 'member'
): Promise<{ success: boolean; error?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }

  try {
    const memberResult = db.exec(`SELECT id FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}`)
    if (memberResult.length && memberResult[0].values.length) {
      return { success: false, error: '用户已在组中' }
    }

    db.run(`INSERT INTO group_members (group_id, user_id, role, created_at) VALUES (${groupId}, ${userId}, '${role}', "${new Date().toLocaleString()}")`)
    saveDB()

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
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }

  try {
    const groupResult = db.exec(`SELECT owner_id FROM \`groups\` WHERE id = ${groupId}`)
    if (!groupResult.length || !groupResult[0].values.length) {
      return { success: false, error: '组不存在' }
    }

    const ownerId = groupResult[0].values[0][0] as number

    const memberResult = db.exec(`SELECT role FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}`)
    if (!memberResult.length || !memberResult[0].values.length) {
      return { success: false, error: '用户不在组中' }
    }

    const memberRole = memberResult[0].values[0][0] as string

    if (userId !== requesterId && ownerId !== requesterId) {
      return { success: false, error: '无权移除此成员' }
    }

    if (memberRole === 'owner') {
      return { success: false, error: '不能移除组管理员' }
    }

    db.run(`DELETE FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}`)
    saveDB()

    return { success: true }
  } catch (err) {
    return { success: false, error: '移除组成员失败' }
  }
}

export const getGroupMembers = async (groupId: number): Promise<GroupMember[]> => {
  const db = getDB()
  if (!db) {
    return []
  }

  const result = db.exec(`
    SELECT gm.id, gm.group_id, gm.user_id, u.username, u.email, gm.role, gm.created_at
    FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ${groupId}
    ORDER BY gm.created_at ASC
  `)

  const members: GroupMember[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      members.push({
        id: row[0] as number,
        groupId: row[1] as number,
        userId: row[2] as number,
        username: row[3] as string,
        email: row[4] as string,
        role: row[5] as string,
        createdAt: new Date(row[6] as string)
      })
    })
  }
  return members
}

export const isGroupOwner = async (groupId: number, userId: number): Promise<boolean> => {
  const db = getDB()
  if (!db) {
    return false
  }

  const result = db.exec(`SELECT owner_id FROM \`groups\` WHERE id = ${groupId} AND owner_id = ${userId}`)
  return result.length > 0 && result[0].values.length > 0
}

export const changeGroup = async (userId: number, groupId: number): Promise<{ success: boolean; message?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, message: '数据库未初始化' }
  }
  try {
    db.run(`UPDATE users SET group_id = ${groupId} WHERE id = ${userId}`)
    saveDB()
    return { success: true }
  } catch (err) {
    console.log(err)
    logger.error(err)
    return { success: false, message: '更新用户分组失败' }
  }
}