import { Meilisearch } from 'meilisearch';
import dotenv from 'dotenv'
dotenv.config()
const meilisearch = new Meilisearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey'
})

export const documentsIndex = meilisearch.index('documents')

export default meilisearch