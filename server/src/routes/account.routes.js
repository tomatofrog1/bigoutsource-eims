import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createAccountValidator } from '../validators/account.validator.js';

const router = Router();
const accountManagers = ['super_admin', 'admin', 'hr_admin'];

router.get('/', AccountController.list);
router.get('/recent', AccountController.recent);
router.post('/', requireRole(accountManagers), validate(createAccountValidator), AccountController.create);
router.post('/:id/touch', requireRole(accountManagers), AccountController.touch);

export default router;
