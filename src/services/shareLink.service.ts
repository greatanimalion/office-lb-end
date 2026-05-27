import { getDB, saveDB, ShareLink } from '../db'
import { encryptPassword, comparePassword } from '../utils/crypto'
import { v4 as uuidv4 } from 'uuid'
import config from '../config/index'

export interface CreateShareLinkOptions {
  documentId: number
  permissions: string
  password?: string
  expiresAt?: Date
  maxViews?: number
}

export const createShareLink = async (
  options: CreateShareLinkOptions,
  userId: number
): Promise<ShareLink | null> => {
  const db = getDB()

  if (!db) {
    return null
  }

  const documentResult = db.exec(`SELECT owner_id FROM documents WHERE id = ${options.documentId}`)
  if (!documentResult.length || !documentResult[0].values.length) {
    return null
  }

  const ownerId = documentResult[0].values[0][0] as number
  if (ownerId !== userId) {
    return null
  }

  const token = uuidv4()
  const hashedPassword = options.password ? await encryptPassword(options.password) : undefined

  db.run(`
    INSERT INTO share_links (document_id, token, password, expires_at, max_views, views, permissions)
    VALUES (
      ${options.documentId},
      "${token}",
      ${hashedPassword ? `"${hashedPassword}"` : 'NULL'},
      ${options.expiresAt ? `"${options.expiresAt.toISOString()}"` : 'NULL'},
      ${options.maxViews || 0},
      0,
      "${options.permissions}"
    )
  `)

  saveDB()

  const result = db.exec(`SELECT * FROM share_links WHERE token = "${token}"`)
  if (!result.length || !result[0].values.length) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    documentId: row[1] as number,
    token: row[2] as string,
    password: row[3] as string | undefined,
    expiresAt: row[4] ? new Date(row[4] as string) : undefined,
    maxViews: row[5] as number,
    views: row[6] as number,
    permissions: row[7] as string,
    createdAt: new Date(row[8] as string)
  }
}

export const getShareLinkByToken = async (token: string): Promise<ShareLink | null> => {
  const db = getDB()

  if (!db) {
    return null
  }

  const result = db.exec(`SELECT * FROM share_links WHERE token = "${token}"`)
  
  if (!result.length || !result[0].values.length) {
    return null
  }

  const row = result[0].values[0]
  const shareLink: ShareLink = {
    id: row[0] as number,
    documentId: row[1] as number,
    token: row[2] as string,
    password: row[3] as string | undefined,
    expiresAt: row[4] ? new Date(row[4] as string) : undefined,
    maxViews: row[5] as number,
    views: row[6] as number,
    permissions: row[7] as string,
    createdAt: new Date(row[8] as string)
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return null
  }

  if (shareLink.maxViews > 0 && shareLink.views >= shareLink.maxViews) {
    return null
  }

  return shareLink
}

export const validateShareLinkPassword = async (token: string, password: string): Promise<boolean> => {
  const shareLink = await getShareLinkByToken(token)
  
  if (!shareLink || !shareLink.password) {
    return false
  }

  return await comparePassword(password, shareLink.password)
}

export const incrementShareLinkViews = async (token: string): Promise<void> => {
  const db = getDB()

  if (!db) {
    return
  }

  db.run(`UPDATE share_links SET views = views + 1 WHERE token = "${token}"`)
  saveDB()
}

export const deleteShareLink = async (token: string, userId: number): Promise<boolean> => {
  const db = getDB()

  if (!db) {
    return false
  }

  const result = db.exec(`
    SELECT sl.document_id, d.owner_id 
    FROM share_links sl
    JOIN documents d ON sl.document_id = d.id
    WHERE sl.token = "${token}"
  `)

  if (!result.length || !result[0].values.length) {
    return false
  }

  const row = result[0].values[0]
  const ownerId = row[1] as number

  if (ownerId !== userId) {
    return false
  }

  db.run(`DELETE FROM share_links WHERE token = "${token}"`)
  saveDB()

  return true
}

export const getDocumentShareLinks = async (documentId: number, userId: number): Promise<ShareLink[]> => {
  const db = getDB()

  if (!db) {
    return []
  }

  const result = db.exec(`
    SELECT sl.* 
    FROM share_links sl
    JOIN documents d ON sl.document_id = d.id
    WHERE sl.document_id = ${documentId} AND d.owner_id = ${userId}
    ORDER BY sl.created_at DESC
  `)

  const links: ShareLink[] = []
  if (result.length && result[0].values.length) {
    result[0].values.forEach((row: unknown[]) => {
      links.push({
        id: row[0] as number,
        documentId: row[1] as number,
        token: row[2] as string,
        password: row[3] as string | undefined,
        expiresAt: row[4] ? new Date(row[4] as string) : undefined,
        maxViews: row[5] as number,
        views: row[6] as number,
        permissions: row[7] as string,
        createdAt: new Date(row[8] as string)
      })
    })
  }

  return links
}