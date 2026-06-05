import { Router } from 'express'
import {
  loginController,
  registerController,
  getUsersController,
  getUserByIdController,
  getAllUsersController,
  changeGroupController
} from '../controllers/user.controller'
import {
  sendVerificationCodeController,

} from '../controllers/verification.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authLimiter } from '../middlewares/rateLimit.middleware'

const router = Router()

router.post('/login', authLimiter, loginController as any)
router.post('/register', authLimiter, registerController as any)
router.post('/sendcode', authLimiter, sendVerificationCodeController as any)

router.use(authenticate)
router.get('/users', getUsersController as any)
router.get('/user/all', getAllUsersController as any)
router.post('/user/change-group', changeGroupController as any)
export default router