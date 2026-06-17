import { Router } from 'express';
import { UserController } from './user.controller.js';

const router = Router();

router.get('/', UserController.list);
router.put('/:id', UserController.update);
router.put('/:id/capabilities', UserController.setCapabilities);
router.put('/:id/approve', UserController.approve);
router.put('/:id/disable', UserController.disable);
router.delete('/:id', UserController.remove);

export default router;
