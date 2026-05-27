import { Response } from 'express'
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js'
import { searchDocuments } from '../services/search.service.js'
import logger from '../utils/logger.js'

export const searchController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { q } = req.query
    const userId = req.user!.id

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: '搜索关键词不能为空' })
      return
    }

    const result = await searchDocuments(q, userId)

    res.json(result)
  } catch (error) {
    logger.error('Search error:', error)
    res.status(500).json({ error: '搜索失败' })
  }
}