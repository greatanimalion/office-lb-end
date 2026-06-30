import { PrismaClient } from '@prisma/client'
import logger from './utils/logger'

let prisma: PrismaClient | null = null

export const initDB = async (): Promise<void> => {
  try {
    prisma = new PrismaClient()
    await prisma.$connect()
    logger.info('Database connected via Prisma')
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    throw error
  }
}

export const getDB = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not initialized')
  }
  return prisma
}

export const saveDB = (): void => {
  // Prisma auto-commits, no manual save needed
}

export const closeDB = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

export { PrismaClient }
export type { ShareLink } from './models/types'
