import { Database } from 'sql.js'
import { getDB, saveDB } from '../db'
import {type Folder} from '../models/types'
export interface CreateFolderOptions {
  filename: string
  parentFolderId?: number
  groupId: number,  
  permission?: string//空代表无权限
}

export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[]
  documents?: { id: number; title: string; filename: string; createdAt: Date }[]
}

export const createFolder = async (options: CreateFolderOptions): Promise<{ success: boolean; id?: number; error?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }
  try {
    const { filename, parentFolderId, groupId, permission } = options

    if (parentFolderId) {
      const parentResult = db.exec(`SELECT id FROM folders WHERE id = ${parentFolderId} AND group_id = ${groupId}`)
      if (!parentResult.length || !parentResult[0].values.length) {
        return { success: false, error: '父文件夹不存在或不属于该组' }
      }
    }

    db.run(
      `INSERT INTO folders (filename, parent_folder_id, group_id, permission, created_at, updated_at)
       VALUES ("${filename}", ${parentFolderId || 'NULL'}, ${groupId}, "${permission || ''}", (datetime('now', 'localtime')), (datetime('now', 'localtime')))`
    )
    const lastIdResult = db.exec('SELECT last_insert_rowid()')
    const lastId = lastIdResult[0].values[0][0] as number

    saveDB()

    return { success: true, id: lastId }
  } catch (err) {
    console.error(err)
    return { success: false, error: '创建文件夹失败' }
  }
}
//递归删除文件夹及其子文件夹
const deleteFolderRecursive = (db: Database, folderId: number): void => {
  const childrenResult = db.exec(`SELECT id FROM folders WHERE parent_folder_id = ${folderId}`)
  if (childrenResult.length > 0 && childrenResult[0].values.length > 0) {
    childrenResult[0].values.forEach((row: unknown[]) => {
      const childId = row[0] as number
      deleteFolderRecursive(db, childId)
    })
  }
  db.run(`DELETE FROM folders WHERE id = ${folderId}`)
}

export const deleteFolder = async (folderId: number): Promise<{ success: boolean; error?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }
  try {
    deleteFolderRecursive(db, folderId)
    saveDB()
    return { success: true }
  } catch (err) {
    return { success: false, error: '删除文件夹失败' }
  }
}

export const updateFolderName = async (folderId: number, newName: string, newPermission: string): Promise<{ success: boolean; error?: string }> => {
  const db = getDB()
  if (!db) {
    return { success: false, error: '数据库未初始化' }
  }

  try {
    const result = db.exec(`SELECT id FROM folders WHERE id = ${folderId}`)
    if (!result.length || !result[0].values.length) {
      return { success: false, error: '文件夹不存在' }
    }

    db.run(`UPDATE folders SET filename = "${newName}", permission = "${newPermission}", updated_at = CURRENT_TIMESTAMP WHERE id = ${folderId}`)

    saveDB()

    return { success: true }
  } catch (err) {
    return { success: false, error: '更新文件夹名称失败' }
  }
}
/**
 * 至少有一个参数不能为空，groupId和parentFolderId不能同时为空
*/
export const getFoldersList = async (groupId?: number, parentFolderId?: number): Promise<Folder[]> => {
  const db = getDB()
  if (!db) {
    return []
  }

  let query = ''
  if (!groupId && !parentFolderId) {
    return []
  }else if (!groupId && !!parentFolderId) {
    query = 'SELECT id,filename,parent_folder_id,group_id,permission,created_at,updated_at FROM folders WHERE parent_folder_id = ' + parentFolderId+' ORDER BY created_at ASC'
  }else if( !!groupId&&!parentFolderId){
      query='SELECT id,filename,parent_folder_id,group_id,permission,created_at,updated_at FROM folders WHERE group_id = ' + groupId +' AND parent_folder_id IS NULL ORDER BY created_at ASC'
  }else  {
    query = 'SELECT id,filename,parent_folder_id,group_id,permission,created_at,updated_at FROM folders WHERE group_id = ' + groupId +' AND parent_folder_id='+parentFolderId+' ORDER BY created_at ASC'
  }

  const result = db.exec(query)
  const folders: Folder[] = []

  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      folders.push({
        id: row[0] as number,
        filename: row[1] as string,
        parentFolderId: row[2] ? (row[2] as number) : undefined,
        groupId: row[3] as number,
        permission: row[4] as string,
        createdAt: new Date(row[5] as string),
        updatedAt: new Date(row[6] as string)
      })
    })
  }

  return folders
}

export const buildFolderTree = async (groupId: number): Promise<FolderWithChildren[]> => {
  const rootFolders = await getFoldersList(groupId)
  
  const allFolders = await getFoldersList(groupId, undefined)
  
  const buildTree = (folder: Folder): FolderWithChildren => {
    const children = allFolders.filter(f => f.parentFolderId === folder.id)
    return {
      ...folder,
      children: children.length > 0 ? children.map(buildTree) : undefined
    }
  }

  return rootFolders.map(buildTree)
}