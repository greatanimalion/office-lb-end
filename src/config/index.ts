import dotenv from 'dotenv'
dotenv.config()
import database from './database'
import redis from './redis'
import onlyoffice from './onlyoffice'
import meilisearch from './meilisearch'
import auth from './auth'
import email from './email'
interface UploadsConfig {
  temp: string
  documents: string
  versions: string
  previews: string
  maxFileSize: number
}

interface LogsConfig {
  level: string
  dir: string
}

interface Config {
  port: number
  nodeServerUrl: string
  email: typeof email
  nodeEnv: string
  database: typeof database
  redis: typeof redis
  onlyoffice: typeof onlyoffice
  meilisearch: typeof meilisearch
  auth: typeof auth
  uploads: UploadsConfig
  logs: LogsConfig
}

const config: Config = {
  nodeServerUrl: process.env.NODE_SERVER_URL || 'http://localhost:5000',
  port: parseInt(process.env.NODE_SERVER_PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database,
  redis,
  onlyoffice,
  meilisearch,
  auth,
  email,
  uploads: {
    temp: process.env.UPLOAD_TEMP_DIR || 'uploads/temp',
    documents: process.env.UPLOAD_DOCUMENTS_DIR || 'uploads/documents',
    versions: process.env.UPLOAD_VERSIONS_DIR || 'uploads/versions',
    previews: process.env.UPLOAD_PREVIEWS_DIR || 'uploads/previews',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  },
  logs: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
}

export default config