import { Router } from 'express';
import { SiteController } from '../controllers/site.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createSiteValidator, updateSiteValidator } from '../validators/site.validator.js';

const router = Router();
const siteManagers = ['super_admin', 'admin'];

router.get('/', SiteController.list);
router.post('/', requireRole(siteManagers), validate(createSiteValidator), SiteController.create);
router.put('/:id', requireRole(siteManagers), validate(updateSiteValidator), SiteController.update);
router.delete('/:id', requireRole(siteManagers), SiteController.remove);

export default router;
