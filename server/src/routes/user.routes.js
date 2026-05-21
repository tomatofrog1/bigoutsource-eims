import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';

const router = Router();

router.get('/', UserController.list);
router.put('/:id/approve', UserController.approve);
router.put('/:id/disable', UserController.disable);

export default router;
