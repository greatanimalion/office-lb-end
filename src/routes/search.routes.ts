import { Router } from 'express'
import { searchController } from '../controllers/search.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.get('/', authenticate, searchController as any)

export default router