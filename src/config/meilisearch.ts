interface MeilisearchConfig {
  host: string
  apiKey: string
  indexName: string
}

const meilisearch: MeilisearchConfig = {
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
  indexName: process.env.MEILISEARCH_INDEX_NAME || 'documents',
}

export default meilisearch