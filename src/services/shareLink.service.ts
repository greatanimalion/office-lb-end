import { getDB } from '../db'
import { encryptPassword, comparePassword } from '../utils/crypto'
import { v4 as uuidv4 } from 'uuid'

export interface ShareLinkData {
  id: number
  documentId: number
  token: string
  password?: string
  expiresAt?: Date
  maxViews: number
  views: number
  permissions: string
  createdAt: Date
}

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
): Promise<ShareLinkData | null> => {
  const prisma = getDB()

  const doc = await prisma.document.findUnique({ where: { id: options.documentId } })
  if (!doc || doc.ownerId !== userId) return null

  const token = uuidv4()
  const hashedPassword = options.password ? await encryptPassword(options.password) : undefined

  const link = await prisma.shareLink.create({
    data: {
      documentId: options.documentId,
      token,
      password: hashedPassword || null,
      expiresAt: options.expiresAt || null,
      maxViews: options.maxViews || 0,
      views: 0,
      permissions: options.permissions,
    },
  })

  return {
    id: link.id,
    documentId: link.documentId,
    token: link.token,
    password: link.password || undefined,
    expiresAt: link.expiresAt || undefined,
    maxViews: link.maxViews,
    views: link.views,
    permissions: link.permissions,
    createdAt: link.createdAt,
  }
}

export const getShareLinkByToken = async (token: string): Promise<ShareLinkData | null> => {
  const prisma = getDB()

  const link = await prisma.shareLink.findUnique({ where: { token } })
  if (!link) return null

  const shareLink: ShareLinkData = {
    id: link.id,
    documentId: link.documentId,
    token: link.token,
    password: link.password || undefined,
    expiresAt: link.expiresAt || undefined,
    maxViews: link.maxViews,
    views: link.views,
    permissions: link.permissions,
    createdAt: link.createdAt,
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
  const prisma = getDB()

  await prisma.shareLink.update({
    where: { token },
    data: { views: { increment: 1 } },
  })
}

export const deleteShareLink = async (token: string, userId: number): Promise<boolean> => {
  const prisma = getDB()

  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { document: { select: { ownerId: true } } },
  })

  if (!link || link.document.ownerId !== userId) return false

  await prisma.shareLink.delete({ where: { token } })

  return true
}

export const getDocumentShareLinks = async (documentId: number, userId: number): Promise<ShareLinkData[]> => {
  const prisma = getDB()

  const links = await prisma.shareLink.findMany({
    where: { documentId, document: { ownerId: userId } },
    orderBy: { createdAt: 'desc' },
  })

  return links.map(link => ({
    id: link.id,
    documentId: link.documentId,
    token: link.token,
    password: link.password || undefined,
    expiresAt: link.expiresAt || undefined,
    maxViews: link.maxViews,
    views: link.views,
    permissions: link.permissions,
    createdAt: link.createdAt,
  }))
}
