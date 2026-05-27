interface DatabaseConfig {
  type: string
  database: string
  synchronize: boolean
  logging: boolean
}
import dotenv from 'dotenv'
dotenv.config()
const database: DatabaseConfig = {
  type: 'sqlite',
  database: process.env.DB_DATABASE || 'database.sqlite',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
}

export default database