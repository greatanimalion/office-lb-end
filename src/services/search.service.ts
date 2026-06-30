import fs from 'fs'
import { getDB } from '../db'
import { documentsIndex } from '../config/meilisearch'
import logger from '../utils/logger'

export interface SearchResult {
  id: number
  title: string
  filename: string
  owner_id: number
  created_at: string
  updated_at: string
  content?: string
  score?: number
}

export interface SearchOptions {
  query: string
  author?: number
  startDate?: string
  endDate?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface DocumentIndex {
  id: string
  title: string
  filename: string
  content: string
  owner_id: number
  created_at: string
  updated_at: string
  tags: string[]
}

let meilisearchAvailable = true

export const initMeiliSearch = async (): Promise<void> => {
  try {
    await documentsIndex.updateSettings({
      searchableAttributes: ['title', 'filename', 'content', 'tags'],
      filterableAttributes: ['owner_id', 'created_at', 'updated_at'],
      sortableAttributes: ['created_at', 'updated_at'],
      displayedAttributes: ['id', 'title', 'filename', 'owner_id', 'created_at', 'updated_at']
    })
    logger.info('MeiliSearch initialized successfully')
  } catch (error) {
    meilisearchAvailable = false
    logger.warn('MeiliSearch not available, falling back to database search:', error)
  }
}

export const addDocumentToIndex = async (document: DocumentIndex): Promise<void> => {
  if (!meilisearchAvailable) return

  try {
    await documentsIndex.addDocuments([document])
  } catch (error) {
    logger.error('Failed to add document to MeiliSearch:', error)
  }
}

export const updateDocumentInIndex = async (document: DocumentIndex): Promise<void> => {
  if (!meilisearchAvailable) return

  try {
    await documentsIndex.updateDocuments([document])
  } catch (error) {
    logger.error('Failed to update document in MeiliSearch:', error)
  }
}

export const deleteDocumentFromIndex = async (documentId: number): Promise<void> => {
  if (!meilisearchAvailable) return

  try {
    await documentsIndex.deleteDocument(documentId.toString())
  } catch (error) {
    logger.error('Failed to delete document from MeiliSearch:', error)
  }
}

export const searchDocuments = async (options: SearchOptions): Promise<SearchResult[]> => {
  if (meilisearchAvailable && options.query) {
    try {
      const filters: string[] = []

      if (options.author) {
        filters.push(`owner_id = ${options.author}`)
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
        offset: options.offset || 0
      })

      return result.hits.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title,
        filename: hit.filename,
        owner_id: hit.owner_id,
        created_at: hit.created_at,
        updated_at: hit.updated_at,
        score: hit._score
      }))
    } catch (error) {
      logger.error('MeiliSearch search failed, falling back to database:', error)
      meilisearchAvailable = false
    }
  }

  return searchDocumentsDB(options)
}

const searchDocumentsDB = async (options: SearchOptions): Promise<SearchResult[]> => {
  const prisma = getDB()

  const where: Record<string, unknown> = {
    status: { not: 0 },
    ...(options.query ? {
      title: { contains: options.query },
    } : {}),
    ...(options.author ? {
      ownerId: options.author,
    } : {}),
  }

  if (options.startDate) {
    where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(options.startDate) }
  }

  if (options.endDate) {
    where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(options.endDate) }
  }

  const docs = await prisma.document.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: options.limit || 20,
    skip: options.offset || 0,
  })

  return docs.map(d => ({
    id: d.id,
    title: d.title || '',
    filename: d.title || '',
    owner_id: d.ownerId,
    created_at: d.updatedAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  }))
}

export const extractDocxText = (filePath: string): string => {
  try {
    if (!fs.existsSync(filePath)) {
      return ''
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    if (content.includes('<?xml')) {
      const textMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
      if (textMatch) {
        return textMatch.map(m => m.replace(/<[^>]*>/g, '')).join(' ')
      }
    }

    return ''
  } catch (error) {
    logger.error('Extract docx text error:', error)
    return ''
  }
}

export const searchByContent = async (query: string, userId: number): Promise<SearchResult[]> => {
  if (meilisearchAvailable) {
    try {
      const result = await documentsIndex.search(query, {
        filter: `owner_id = ${userId}`,
        limit: 20
      })

      return result.hits.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title,
        filename: hit.filename,
        owner_id: hit.owner_id,
        created_at: hit.created_at,
        updated_at: hit.updated_at,
        content: hit.content?.substring(0, 200),
        score: hit._score
      }))
    } catch (error) {
      logger.error('MeiliSearch content search failed:', error)
    }
  }

  const prisma = getDB()

  const docs = await prisma.document.findMany({
    where: {
      ownerId: userId,
      status: { not: 0 },
    },
    include: { versions: { orderBy: { vNumber: 'desc' }, take: 1 } },
  })

  const results: SearchResult[] = []

  for (const doc of docs) {
    const filepath = doc.versions[0]?.filepath
    if (filepath) {
      const content = extractDocxText(filepath)
      if (content.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          id: doc.id,
          title: doc.title || '',
          filename: doc.title || '',
          owner_id: doc.ownerId,
          created_at: doc.updatedAt.toISOString(),
          updated_at: doc.updatedAt.toISOString(),
          content: content.substring(0, 200),
        })
      }
    }
  }

  return results
}

export const getDocumentsByTag = async (tag: string, userId: number): Promise<SearchResult[]> => {
  if (meilisearchAvailable) {
    try {
      const result = await documentsIndex.search(tag, {
        filter: `owner_id = ${userId}`,
        limit: 20
      })

      return result.hits.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title,
        filename: hit.filename,
        owner_id: hit.owner_id,
        created_at: hit.created_at,
        updated_at: hit.updated_at
      }))
    } catch (error) {
      logger.error('MeiliSearch tag search failed:', error)
    }
  }

  const prisma = getDB()

  const docs = await prisma.document.findMany({
    where: {
      ownerId: userId,
      status: { not: 0 },
      title: { contains: tag },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return docs.map(d => ({
    id: d.id,
    title: d.title || '',
    filename: d.title || '',
    owner_id: d.ownerId,
    created_at: d.updatedAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  }))
}

export const suggestTags = async (query: string): Promise<string[]> => {
  const prisma = getDB()

  const docs = await prisma.document.findMany({
    where: {
      title: {
        contains: query,
      },
    },
    select: { title: true },
    take: 50,
  })

  const tags: string[] = []

  for (const doc of docs) {
    if (doc.title) {
      const match = doc.title.match(/\[([^\]]+)\]/)
      if (match) {
        tags.push(match[1])
      }
    }
  }

  return [...new Set(tags)]
}
