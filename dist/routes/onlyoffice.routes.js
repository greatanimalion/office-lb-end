import { Router } from 'express';
import { getEditorConfigController, callbackController } from '../controllers/onlyoffice.controller';
import { authenticate } from '../middlewares/auth.middleware';
const router = Router();
router.get('/:id/config', authenticate, getEditorConfigController);
router.post('/:id/callback', callbackController);
export default router;
