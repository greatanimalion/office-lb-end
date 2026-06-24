import meilisearch from '../config/meilisearch'
export const documentsIndex = meilisearch.index('documents')
export const initMeiliSearch = async (): Promise<void> => {
  try {
    await meilisearch.health()
    await documentsIndex.updateSettings({
      searchableAttributes: ['title', 'content', 'tags'],
      filterableAttributes: ['owner_id', 'owner_type', 'created_at', 'updated_at'],
      sortableAttributes: ['created_at', 'updated_at'],
      displayedAttributes: ['id', 'title', 'filename', 'owner_id', 'owner_type', 'created_at', 'updated_at']
    })
    
    console.log('MeiliSearch initialized successfully')
  } catch (error) {
    console.warn('MeiliSearch not available, falling back to database search:', error)
  }
}

export interface SearchResult<T extends Document = Document> {
  hits: T[]
  total: number
  offset: number
  limit: number
}
export const searchDocuments = async <T extends Document>(
  query: string,
  options?: {
    filters?: string
    sort?: string[]
    offset?: number
    limit?: number
  }
): Promise<SearchResult<T>> => {
  try {
    const result = await documentsIndex.search<T>(query, {
      filter: options?.filters,
      sort: options?.sort,
      offset: options?.offset || 0,
      limit: options?.limit || 20
    })
    
    return {
      hits: result.hits,
      total: (result as unknown as { total: number }).total || result.hits.length,
      offset: result.offset,
      limit: result.limit
    }
  } catch (error) {
    console.error('MeiliSearch search failed:', error)
    return { hits: [], total: 0, offset: 0, limit: options?.limit || 20 }
  }
}

export const addDocumentToIndex = async <T extends Document>(document: T): Promise<void> => {
  try {
    await documentsIndex.addDocuments([document])
  } catch (error) {
    console.error('Failed to add document to MeiliSearch:', error)
  }
}

export const updateDocumentInIndex = async <T extends Document>(document: T): Promise<void> => {
  try {
    await documentsIndex.updateDocuments([document])
  } catch (error) {
    console.error('Failed to update document in MeiliSearch:', error)
  }
}

export const deleteDocumentFromIndex = async (id: string | number): Promise<void> => {
  try {
    await documentsIndex.deleteDocument(id)
  } catch (error) {
    console.error('Failed to delete document from MeiliSearch:', error)
  }
}

export const deleteDocumentsFromIndex = async (ids: (string | number)[]): Promise<void> => {
  try {
    const stringIds = ids.map(id => String(id))
    await documentsIndex.deleteDocuments(stringIds)
  } catch (error) {
    console.error('Failed to delete documents from MeiliSearch:', error)
  }
}

export const getIndexStats = async (): Promise<{
  numberDocuments: number
  isIndexing: boolean
}> => {
  try {
    const stats = await documentsIndex.getStats()
    return {
      numberDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing
    }
  } catch (error) {
    console.error('Failed to get MeiliSearch index stats:', error)
    return { numberDocuments: 0, isIndexing: false }
  }
}

export default meilisearch