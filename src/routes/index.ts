import { Router } from 'express'
import userRoutes from './user.routes'
import documentRoutes from './document.routes'
import folderRoutes from './folder.routes'
import permissionRoutes from './permission.routes'
import onlyofficeRoutes from './onlyoffice.routes'
import searchRoutes from './search.routes'
import auditRoutes from './audit.routes'

const router: import('express').Router = Router()

router.use('/auth', userRoutes)
router.use('/documents', documentRoutes)
router.use('/folders', folderRoutes)
router.use('/permissions', permissionRoutes)
router.use('/onlyoffice', onlyofficeRoutes)
router.use('/search', searchRoutes)
router.use('/audit', auditRoutes)

export default router