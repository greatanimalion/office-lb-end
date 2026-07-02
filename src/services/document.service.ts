import fs from 'fs'
import { getDB } from '../db'
import { type Document as _Document, DocumentVersion, OwnerType } from '../models/document.js'
import logger from '../utils/logger'

type Document = Partial<_Document> & Partial<DocumentVersion>
type DocumentVersionWithCreatedAt = Partial<DocumentVersion> & { created_at: string, version_number: number, filesize: number, alter_by_username: string }
// 获取文档的所有版本
export const getDocumentVersion = async (documentId: number): Promise<DocumentVersionWithCreatedAt[]> => {
  const prisma = getDB()
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    include: { user: { select: { username: true } } },
    orderBy: { vNumber: 'desc' },
  })

  return versions.map(v => ({
    id: v.id,
    document_id: v.documentId,
    filesize: v.filesize || 0,
    version_number: v.vNumber || 0,
    created_at: v.createdAt.toISOString(),
    alter_by_username: v.user?.username || '未知',
  }))
}
// 获取文档的最大版本号
export const getMaxVersionNumber = async (documentId: number): Promise<number> => {
  const prisma = getDB()

  const result = await prisma.documentVersion.aggregate({
    where: { documentId },
    _max: { vNumber: true },
  })

  return result._max.vNumber || 0
}

type OmitDocument = Omit<Document, 'owner_type'>
// 根据owner_type获取所有文档
export const getAllDocuments = async (page: number, pageSize: number = 100, ownerId: number, owner_type: OwnerType, filter?: string): Promise<{  documents: OmitDocument[], total: number }> => {
  const offset = (page - 1) * pageSize
  const prisma = getDB()

  const where: Record<string, unknown> = {
    ownerId,
    ownerType: owner_type,
  }

  if (filter) {
    where.title = { contains: filter }
  }

  const [docRecords, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { versions: { orderBy: { vNumber: 'desc' }, take: 1 } },
      skip: offset,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.document.count({ where }),
  ])

  return {
    documents: docRecords.map(d => ({
      id: d.id,
      document_v_id: d.documentVId || 0,
      title: d.title || '',
      fileSize: d.versions[0]?.filesize || 0,
      status: d.status,
      version_number: d.versions[0]?.vNumber || 0,
      permission: d.permission!,
      locked: d.locked,
      locked_by: d.lockedBy || undefined,
      created_at: d.versions[0]?.createdAt.toISOString() || d.updatedAt.toISOString(),
      updated_at: d.updatedAt.toISOString(),
    })),
    total,
  }
}
// 根据owner_id获取所有文档
export const getDocumentsByOwner = async (ownerId: number): Promise<Document[]> => {
  const prisma = getDB()

  const docs = await prisma.document.findMany({
    where: { ownerId, status: { not: 0 } },
    include: { versions: { orderBy: { vNumber: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  })

  return docs.map(d => ({
    id: d.id,
    title: d.title || '',
    filepath: d.versions[0]?.filepath || '',
    fileSize: d.versions[0]?.filesize || 0,
    owner_id: d.ownerId,
    status: d.status,
    locked: d.locked,
    locked_by: d.lockedBy || undefined,
    created_at: d.versions[0]?.createdAt.toISOString() || d.updatedAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  }))
}

export const getSharedDocuments = async (userId: number): Promise<Document[]> => {
  const prisma = getDB()

  const shares = await prisma.documentShare.findMany({
    where: { userId },
    include: {
      document: {
        include: { versions: { orderBy: { vNumber: 'desc' }, take: 1 } },
      },
    },
    orderBy: { document: { updatedAt: 'desc' } },
  })

  return shares.map(s => ({
    id: s.document.id,
    title: s.document.title || '',
    filepath: s.document.versions[0]?.filepath || '',
    fileSize: s.document.versions[0]?.filesize || 0,
    owner_id: s.document.ownerId,
    status: s.document.status,
    locked: s.document.locked,
    locked_by: s.document.lockedBy || undefined,
    created_at: s.document.versions[0]?.createdAt.toISOString() || s.document.updatedAt.toISOString(),
    updated_at: s.document.updatedAt.toISOString(),
    permission: s.permission,
  }))
}
// 根据id获取文档详情
export const getDocumentById = async (id: number): Promise<Document | null> => {
  const prisma = getDB()
  const doc = await prisma.document.findUnique({
    where: { id },
  })
  if (!doc) return null
  let version = null
  if (doc.documentVId) {
    version = await prisma.documentVersion.findUnique({
      where: { id: doc.documentVId },
    })
  }
  if (!version) {
    [version] = await prisma.documentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: { vNumber: 'desc' },
      take: 1,
    })
  }
  return {
    id: doc.id,
    title: doc.title || '',
    owner_id: doc.ownerId,
    owner_type: doc.ownerType as OwnerType,
    permission: doc.permission || undefined,
    locked: doc.locked,
    locked_by: doc.lockedBy || undefined,
    status: doc.status,
    updated_at: doc.updatedAt.toISOString(),
    filepath: version?.filepath || '',
    fileSize: version?.filesize || 0,
    v_number: version?.vNumber || 0,
    alter_by: version?.alterBy || 0,
    created_at: version?.createdAt.toISOString() || doc.updatedAt.toISOString(),
  }
}
// 创建文档
export const createDocument = async (
  ownerId: number,
  owner_type: OwnerType,
  title: string
): Promise<number> => {
  const prisma = getDB()

  const doc = await prisma.document.create({
    data: {
      ownerId,
      ownerType: owner_type,
      title,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: ownerId,
      documentId: doc.id,
      action: '创建文档',
    },
  })

  return doc.id
}
// 关联文档版本
export const DocumentRelateDV = async (d_id: number, d_v_id: number) => {
  const prisma = getDB()
  await prisma.document.update({
    where: { id: d_id },
    data: { documentVId: d_v_id },
  })
}
// 创建文档版本
export const createDocumentVersion = async (userId: number, documentId: number, filepath: string,
  filesize: number = 0, V: number = 1,
): Promise<number> => {
  const prisma = getDB()

  const version = await prisma.documentVersion.create({
    data: {
      documentId,
      vNumber: V,
      filepath,
      alterBy: userId,
      filesize,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      documentId,
      action: `创建版本 ${V}`,
    },
  })

  return version.id
}
// 更新文档
export const updataDocuemnt = async (dId: number, title: string, permission: string): Promise<boolean> => {
  const prisma = getDB()
  try {
    await prisma.document.update({
      where: { id: dId },
      data: { title, permission },
    })
    return true
  } catch {
    return false
  }
}
// 恢复文档版本
export const restoreDocumentVersion = async (documentId: number, versionNumber: number, userId: number): Promise<boolean> => {
  const prisma = getDB()
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { documentVId: versionNumber },
    })
    await prisma.auditLog.create({
      data: {
        userId,
        documentId,
        action: `恢复版本 ${versionNumber}`,
      },
    })
    return true
  } catch {
    return false
  }
}
// 锁定文档
export const lockDocument = async (documentId: number, userId: number): Promise<boolean> => {
  const prisma = getDB()

  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.ownerId !== userId || doc.locked === 1) {
    return false
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { locked: 1, lockedBy: userId },
  })
  await prisma.auditLog.create({
    data: { userId, documentId, action: '锁定文档' },
  })

  return true
}
// 解锁文档
export const unlockDocument = async (documentId: number, userId: number): Promise<boolean> => {
  const prisma = getDB()

  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) return false

  if (doc.ownerId !== userId && doc.lockedBy !== userId) {
    return false
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { locked: 0, lockedBy: null },
  })
  await prisma.auditLog.create({
    data: { userId, documentId, action: '解锁文档' },
  })

  return true
}
// 更新文档
export const updateDocument = async (
  id: number,
  title: string,
  userId: number,
  permission?: string,
): Promise<boolean> => {
  const prisma = getDB()
  console.log(id,
  title,
  userId,
  permission )
  
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc || doc.ownerId !== userId) return false
  if (permission) {
    await prisma.document.update({
      where: { id },
      data: { title, permission: permission.toString().trim() },
    })
  } else {
    await prisma.document.update({
      where: { id },
      data: { title },
    })
  }
  await prisma.auditLog.create({
    data: { userId, documentId: id, action: '修改文档信息' },
  })
  return true
}

export const deleteDocument = async (id: number, userId: number): Promise<boolean> => {
  const prisma = getDB()

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return false

  if (doc.ownerId !== userId) return false

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
  })

  for (const version of versions) {
    if (version.filepath && fs.existsSync(version.filepath)) {
      fs.unlinkSync(version.filepath)
    }
  }

  await prisma.documentVersion.deleteMany({ where: { documentId: id } })
  await prisma.documentShare.deleteMany({ where: { documentId: id } })
  await prisma.document.delete({ where: { id } })
  await prisma.auditLog.create({
    data: { userId, documentId: id, action: '删除文档' },
  })

  return true
}

export const deleteDVserion = async (dvId: number): Promise<boolean> => {
  const prisma = getDB()
  try {
    await prisma.documentVersion.delete({ where: { id: dvId } })
    return true
  } catch {
    return false
  }
}

export const shareDocument = async (
  documentId: number,
  targetUserId: number,
  permission: string,
  userId: number
): Promise<boolean> => {
  const prisma = getDB()

  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.ownerId !== userId) return false

  try {
    await prisma.documentShare.create({
      data: {
        documentId,
        userId: targetUserId,
        permission,
        sharedBy: userId,
      },
    })
    await prisma.auditLog.create({
      data: { userId, documentId, action: `分享文档给用户 ${targetUserId}` },
    })
    return true
  } catch {
    return false
  }
}

export const unshareDocument = async (
  documentId: number,
  targetUserId: number,
  userId: number
): Promise<boolean> => {
  const prisma = getDB()

  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.ownerId !== userId) return false

  await prisma.documentShare.deleteMany({
    where: { documentId, userId: targetUserId },
  })

  return true
}

export const trackDocumentUpdate = async (id: number, userId: number): Promise<void> => {
  const prisma = getDB()

  await prisma.document.update({
    where: { id },
    data: { updatedAt: new Date() },
  })
}
