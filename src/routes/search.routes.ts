import { Router } from 'express'
import { searchController } from '../controllers/search.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router: import('express').Router = Router()

router.get('/', authenticate, searchController)

export default router