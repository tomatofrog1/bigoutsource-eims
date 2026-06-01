import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createAccountValidator, updateAccountValidator } from '../validators/account.validator.js';

const router = Router();
const accountManagers = ['super_admin', 'admin', 'hr_admin'];

router.get('/', AccountController.list);
router.get('/recent', AccountController.recent);
router.post('/', requireRole(accountManagers), validate(createAccountValidator), AccountController.create);
router.put('/:id', requireRole(accountManagers), validate(updateAccountValidator), AccountController.update);
router.delete('/:id', requireRole(accountManagers), AccountController.remove);
router.post('/:id/touch', requireRole(accountManagers), AccountController.touch);

export default router;
