import { Router } from 'express';
import { RoleController } from './role.controller.js';
import { requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// Listing roles powers the user-management role pickers (users.manage = Super Admin).
router.get('/', requirePermission('users.manage'), RoleController.list);

// Editing roles is the Role editor (roles.manage = Super Admin only).
router.get('/capabilities', requirePermission('roles.manage'), RoleController.catalog);
router.post('/', requirePermission('roles.manage'), RoleController.create);
router.put('/:slug', requirePermission('roles.manage'), RoleController.update);
router.delete('/:slug', requirePermission('roles.manage'), RoleController.remove);

export default router;
