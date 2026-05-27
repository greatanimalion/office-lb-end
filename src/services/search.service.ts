import { getDocumentsByOwner, getSharedDocuments, Document } from './document.service'

export interface SearchResult {
  documents: Document[]
  total: number
}

export const searchDocuments = async (
  query: string,
  userId: number
): Promise<SearchResult> => {
  const ownedDocuments = await getDocumentsByOwner(userId)
  const sharedDocuments = await getSharedDocuments(userId)

  const allDocuments = [...ownedDocuments, ...sharedDocuments]

  const lowerQuery = query.toLowerCase()

  const filtered = allDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.filename.toLowerCase().includes(lowerQuery)
  )

  return {
    documents: filtered,
    total: filtered.length
  }
}

export const buildSearchIndex = async (documents: Document[]): Promise<void> => {
  console.log(`Building search index for ${documents.length} documents`)
}

export const updateSearchIndex = async (document: Document): Promise<void> => {
  console.log(`Updating search index for document ${document.id}`)
}