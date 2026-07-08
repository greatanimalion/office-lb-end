import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import { getDB } from '../db.js'
import { documentsIndex } from '../config/meilisearch.js'
import logger from '../utils/logger.js'

export interface SearchResult {
  id: number
  title: string
  accessedAt: string
}

export interface SearchOptions {
  query: string
  author?: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface DocumentIndex {
  id: string //documenId
  title: string
  content: string
  userId: number
  // tags: string[]
  accessedAt: string
}

let meilisearchAvailable = true

export const initMeiliSearch = async (): Promise<void> => {
  try {
    await documentsIndex.update({ primaryKey: 'id' })
    await documentsIndex.updateSettings({
      searchableAttributes: ['title', 'content'],
      filterableAttributes: ['userId', 'accessedAt'],
      sortableAttributes: ['accessedAt'],
      displayedAttributes: ['id', 'title', 'accessedAt'],
    })
    logger.info('MeiliSearch settings updated')

    // 启动时批量加载已有文档到索引
    await bulkIndexExistingDocuments()

    logger.info('MeiliSearch initialized successfully')
  } catch (error) {
    meilisearchAvailable = false
    logger.warn('MeiliSearch not available, falling back to database search:', error)
  }
}

/** 批量加载有版本的文档到 MeiliSearch 索引（启动时执行一次） */
async function bulkIndexExistingDocuments(): Promise<void> {
  if (!meilisearchAvailable) return
  const prisma = getDB()

  try {
    // 从最近访问记录取文档（去重），关联最新版本用于提取正文
    const recents = await prisma.recentDocument.findMany({
      include: {
        document: {
          include: {
            versions: { orderBy: { vNumber: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { accessedAt: 'desc' },
      take: 500,
    })

    if (recents.length === 0) {
      logger.info('No existing documents to index')
      return
    }

    // 以 documentId 去重，只取未删除的文档
    const seen = new Set<number>()
    const docs = recents.filter(r => {
      if (seen.has(r.documentId)) return false
      seen.add(r.documentId)
      return r.document.status !== 0
    }).map(r => ({
      id: r.document.id,
      title: r.document.title || '',
      ownerId: r.document.ownerId,
      accessedAt: r.accessedAt,
      filepath: r.document.versions[0]?.filepath || null,
    }))

    if (docs.length === 0) {
      logger.info('No accessible documents to index')
      return
    }

    const entries = await Promise.all(docs.map(async (doc) => {
      let content = ''
      if (doc.filepath) {
        try {
          content = await extractTextFromFile(doc.filepath)
        } catch {
          // 文件不存在或无法解析时跳过内容提取
        }
      }
      return {
        id: doc.id.toString(),
        title: doc.title,
        content,
        userId: doc.ownerId,
        accessedAt: doc.accessedAt.toISOString(),
      } satisfies DocumentIndex
    }))

    // addDocuments 返回异步任务，需等待完成
    const task = await documentsIndex.addDocuments(entries)
    const result = await documentsIndex.tasks.waitForTask(task.taskUid, { timeout: 10000 })
    if (result.status === 'failed') {
      logger.error(`MeiliSearch bulk index task failed: ${result.error?.message}`)
    } else {
      logger.info(`Bulk indexed ${entries.length} documents to MeiliSearch (task: ${result.status})`)
    }
  } catch (error) {
    logger.error('Failed to bulk index existing documents:', error)
  }
}
// 新增文档到索引
export const addDocumentToIndex = async (document: DocumentIndex): Promise<void> => {
  if (!meilisearchAvailable) return
  try {
    await documentsIndex.addDocuments([document])
  } catch (error) {
    logger.error('Failed to add document to MeiliSearch:', error)
  }
}
// 更新文档索引
export const updateDocumentInIndex = async (document: DocumentIndex): Promise<void> => {
  if (!meilisearchAvailable) return
  try {
    await documentsIndex.updateDocuments([document])
  } catch (error) {
    logger.error('Failed to update document in MeiliSearch:', error)
  }
}
// 删除文档索引
export const deleteDocumentFromIndex = async (documentId: number): Promise<void> => {
  if (!meilisearchAvailable) return
  try {
    await documentsIndex.deleteDocument(documentId.toString())
  } catch (error) {
    logger.error('Failed to delete document from MeiliSearch:', error)
  }
}

// ==================== 文件名搜索 ====================

/** 通用搜索：匹配文件名 + 标题，返回用户可访问的文档 */
export const searchDocuments = async (options: SearchOptions): Promise<SearchResult[]> => {
  // MeiliSearch 路径
  if (meilisearchAvailable && options.query) {
    //这一步骤根据author,startDate endDate可以实时获取数据库的文档然后updateDocumentInIndex更新索引,根据query进行搜索吗?
    try {
      const filters: string[] = []
      
      if (options.author) {
        filters.push(`userId = ${options.author}`)
      }
      if (options.startDate) {
        filters.push(`created_at >= "${options.startDate}"`)
      }
      if (options.endDate) {
        filters.push(`created_at <= "${options.endDate}"`)
      }
      
      const result = await documentsIndex.search(options.query, {
        filter: filters.length > 0 ? filters.join(' AND ') : undefined,
        limit: options.limit || 20,
        offset: options.offset || 0,
      })
      console.log('search result hits:', result.hits.length)
      return result.hits.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title,
        accessedAt: hit.accessedAt,
      }))
    } catch (error) {
      logger.error('MeiliSearch search failed, falling back to database:', error)
      meilisearchAvailable = false
    }
  }

  // DB 降级路径
  // return searchDocumentsDB(options)
  return []
}

/** DB 降级搜索：文件名/标题 LIKE + AclEntry 权限过滤 */
// const searchDocumentsDB = async (options: SearchOptions): Promise<SearchResult[]> => {
//   const prisma = getDB()
//   const userId = options.author
//   if (!userId) return []

//   const accessibleIds = await getAccessibleDocumentIds(userId)
//   if (accessibleIds.length === 0) return []

//   const where: Record<string, unknown> = {
//     id: { in: accessibleIds },
//     status: { not: 0 },
//   }
//   if (options.query) {
//     where.title = { contains: options.query }
//   }
//   if (options.startDate) {
//     where.updatedAt = {
//       ...((where.updatedAt as Record<string, unknown>) || {}),
//       gte: new Date(options.startDate),
//     }
//   }
//   if (options.endDate) {
//     where.updatedAt = {
//       ...((where.updatedAt as Record<string, unknown>) || {}),
//       lte: new Date(options.endDate),
//     }
//   }

//   const docs = await prisma.document.findMany({
//     where,
//     orderBy: { updatedAt: 'desc' },
//     take: options.limit || 20,
//     skip: options.offset || 0,
//   })

//   return docs.map(d => ({
//     id: d.id,
//     title: d.title || '',
//     accessedAt: d.updatedAt.toISOString(),
//   }))
// }

// ==================== 文件内容搜索 ====================

/** 支持的文本提取映射 */
const TEXT_EXTRACTORS: Record<string, (filePath: string) => Promise<string>> = {
  '.docx': extractDocx,
}

/**
 * 从文件路径中提取纯文本内容，供全文搜索索引使用
 * 支持格式：.docx
 * @param filePath - 文件绝对路径
 * @returns 提取后的纯文本（最多 10MB），提取失败返回空字符串 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  if (!filePath || !fs.existsSync(filePath)) return ''
  const ext = path.extname(filePath).toLowerCase()
  const extractor = TEXT_EXTRACTORS[ext]
  if (!extractor) return ''
  try {
    let text = await extractor(filePath)
    if (text.length > 10_000_000) text = text.slice(0, 10_000_000)
    return text
  } catch (err) {
    logger.error(`Extract text failed for ${filePath}:`, err)
    return ''
  }
}

/**
 * 使用 mammoth 从 docx 文件中提取纯文本
 * @param filePath - .docx 文件路径
 * @returns 提取的纯文本，失败返回空字符串 */
async function extractDocx(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value || ''
  } catch (err) {
    logger.error(`mammoth extract docx failed: ${filePath}`, err)
    return ''
  }
}

/**
 * 全文内容搜索：搜索文档正文内容
 * 1. MeiliSearch 全文索引
 * 2. DB + 文件内容解析降级
 */
export const searchByContent = async (
  query: string,
  userId: number,
): Promise<SearchResult[]> => {
  if (!query.trim()) return []

  // ========== MeiliSearch 路径 ==========
  if (meilisearchAvailable) {
    try {
      const result = await documentsIndex.search(query, {
        filter: `userId = ${userId}`,
        limit: 20,
      })
      return result.hits.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title,
        accessedAt: hit.accessedAt,
        content: hit.content?.substring(0, 200),

      }))
    } catch (error) {
      logger.error('MeiliSearch content search failed, falling back:', error)
      meilisearchAvailable = false
      return []
    }
  }
  return []
  // ========== DB + 文件解析降级路径 ==========
  // const prisma = getDB()

  // 1. 获取用户可访问的文档
  // const accessibleIds = await getAccessibleDocumentIds(userId)
  // if (accessibleIds.length === 0) return []

  // const docs = await prisma.document.findMany({
  //   where: { id: { in: accessibleIds }, status: { not: 0 } },
  //   include: { versions: { orderBy: { vNumber: 'desc' }, take: 1 } },
  // })

  // const queryLower = query.toLowerCase()
  // const results: SearchResult[] = []

  // for (const doc of docs) {
  //   // 先匹配标题（更快）
  //   if (doc.title?.toLowerCase().includes(queryLower)) {
  //     results.push({
  //       id: doc.id,
  //       title: doc.title || '',
  //       accessedAt: doc.updatedAt.toISOString(),
  //     })
  //     continue
  //   }

  //   // 再匹配正文内容
  //   const filepath = doc.versions[0]?.filepath
  //   if (!filepath) continue
  //   const content = await extractTextFromFile(filepath)
  //   if (content && content.toLowerCase().includes(queryLower)) {
  //     results.push({
  //       id: doc.id,
  //       title: doc.title || '',
  //       accessedAt: doc.updatedAt.toISOString(),
  //     })
  //   }
  // }

  // return results
}

// ==================== 标签搜索 ====================

/**
 * 按标签搜索用户可访问的文档
 * 标签匹配文档标题（含 MeiliSearch 降级 DB 两种路径）
 * @param tag - 标签关键词
 * @param userId - 当前用户 ID
 * @returns 匹配的文档列表 */
// export const getDocumentsByTag = async (
//   tag: string,
//   userId: number,
// ): Promise<SearchResult[]> => {
//   if (meilisearchAvailable) {
//     try {
//       const result = await documentsIndex.search(tag, {
//         filter: `owner_id = ${userId}`,
//         limit: 20,
//       })
//       return result.hits.map((hit: any) => ({
//         id: parseInt(hit.id),
//         title: hit.title,
//         filename: hit.filename,
//         owner_id: hit.owner_id,
//         folder_id: hit.folder_id ?? null,
//         created_at: hit.created_at,
//         updated_at: hit.updated_at,
//       }))
//     } catch (error) {
//       logger.error('MeiliSearch tag search failed:', error)
//     }
//   }

//   const prisma = getDB()
//   const accessibleIds = await getAccessibleDocumentIds(userId)
//   if (accessibleIds.length === 0) return []

//   const docs = await prisma.document.findMany({
//     where: { id: { in: accessibleIds }, status: { not: 0 }, title: { contains: tag } },
//     orderBy: { updatedAt: 'desc' },
//   })

//   return docs.map(d => ({
//     id: d.id,
//     title: d.title || '',
//     filename: d.title || '',
//     owner_id: d.ownerId,
//     folder_id: d.folderId,
//     created_at: d.updatedAt.toISOString(),
//     updated_at: d.updatedAt.toISOString(),
//   }))
// }

/**
 * 根据关键词建议标签（从文档标题 [标签] 格式中提取）
 * @param query - 搜索关键词，匹配文档标题
 * @returns 去重后的标签数组 */
// export const suggestTags = async (query: string): Promise<string[]> => {
//   const prisma = getDB()
//   const docs = await prisma.document.findMany({
//     where: { title: { contains: query } },
//     select: { title: true },
//     take: 50,
//   })
//   const tags: string[] = []
//   for (const doc of docs) {
//     if (doc.title) {
//       const match = doc.title.match(/\[([^\]]+)\]/)
//       if (match) tags.push(match[1])
//     }
//   }
//   return [...new Set(tags)]
// }

// ==================== 工具方法 ====================

/**
 * 获取用户可访问的所有文档 ID
 *  - 自己创建的文档
 *  - 通过 AclEntry 授权给自己的文档
 *  - 所在文件夹通过 AclEntry 授权给自己的文档
 */
// async function getAccessibleDocumentIds(userId: number): Promise<number[]> {
//   const prisma = getDB()

//   const [ownDocs, docAclEntries, folderAclEntries] = await Promise.all([
//     prisma.document.findMany({
//       where: { ownerId: userId, status: { not: 0 } },
//       select: { id: true },
//     }),
//     prisma.aclEntry.findMany({
//       where: {
//         resourceType: 'document',
//         OR: [
//           { principalType: 'user', principalId: userId },
//         ],
//       },
//       select: { resourceId: true },
//     }),
//     prisma.aclEntry.findMany({
//       where: {
//         resourceType: 'folder',
//         OR: [
//           { principalType: 'user', principalId: userId },
//         ],
//       },
//       select: { resourceId: true },
//     }),
//   ])

//   const accessibleIds = new Set<number>()
//   ownDocs.forEach(d => accessibleIds.add(d.id))
//   docAclEntries.forEach(e => accessibleIds.add(e.resourceId))

//   if (folderAclEntries.length > 0) {
//     const folderDocs = await prisma.document.findMany({
//       where: { folderId: { in: folderAclEntries.map(e => e.resourceId) }, status: { not: 0 } },
//       select: { id: true },
//     })
//     folderDocs.forEach(d => accessibleIds.add(d.id))
//   }

//   return [...accessibleIds]
// }

/** @deprecated 请使用 extractTextFromFile */
export const extractDocxText = extractDocx
