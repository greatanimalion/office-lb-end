import { Router } from 'express'
import {
  createGroupController,
  updateGroupController,
  deleteGroupController,

  getAllGroupsController,
  addMemberController,
  removeMemberController,
  getMembersController
} from '../controllers/group.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', authenticate, createGroupController as any)
router.put('/:id', authenticate, updateGroupController as any)
router.delete('/:id', authenticate, deleteGroupController as any)
router.get('/all', authenticate, getAllGroupsController as any)
router.post('/:id/members', authenticate, addMemberController as any)
router.delete('/:id/members/:userId', authenticate, removeMemberController as any)
router.get('/:id/members', authenticate, getMembersController as any)

export default router