import { Router } from 'express'
import {
  loginController,
  registerController,
  getUsersController,
  getUserByIdController,
  getAllUsersController
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
router.get('/users', authenticate, getUsersController as any)
router.get('/user/:id', authenticate, getUserByIdController as any)
router.get('/user/all', authenticate, getAllUsersController as any)

export default router