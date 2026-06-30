import { Router } from 'express'
import userRoutes from './user.routes'
import oauthRoutes from './oauth.routes'
import documentRoutes from './document.routes'
import folderRoutes from './folder.routes'
import permissionRoutes from './permission.routes'
import onlyofficeRoutes from './onlyoffice.routes'
import searchRoutes from './search.routes'
import auditRoutes from './audit.routes'
import groupRoutes from './group.routes'

const router = Router()

router.use('/auth', userRoutes)
router.use('/oauth', oauthRoutes)
router.use('/documents', documentRoutes)
router.use('/folders', folderRoutes)
router.use('/permissions', permissionRoutes)
router.use('/onlyoffice', onlyofficeRoutes)
router.use('/search', searchRoutes)
router.use('/audit', auditRoutes)
router.use('/groups', groupRoutes)

export default router