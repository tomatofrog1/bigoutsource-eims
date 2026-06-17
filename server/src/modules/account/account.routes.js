import { Router } from 'express';
import { AccountController } from './account.controller.js';
import { requirePermission } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createAccountValidator, updateAccountValidator } from './account.validator.js';

const router = Router();

router.get('/', requirePermission('departments.view'), AccountController.list);
router.get('/recent', requirePermission('departments.view'), AccountController.recent);
router.post('/', requirePermission('departments.edit'), validate(createAccountValidator), AccountController.create);
router.put('/:id', requirePermission('departments.edit'), validate(updateAccountValidator), AccountController.update);
router.delete('/:id', requirePermission('departments.edit'), AccountController.remove);
router.post('/:id/touch', requirePermission('departments.edit'), AccountController.touch);

export default router;
