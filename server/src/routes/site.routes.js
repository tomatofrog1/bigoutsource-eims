import { Router } from 'express';
import { SiteController } from '../controllers/site.controller.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createSiteValidator, updateSiteValidator } from '../validators/site.validator.js';

const router = Router();

router.get('/', SiteController.list);
router.post('/', requirePermission('sites.edit'), validate(createSiteValidator), SiteController.create);
router.put('/:id', requirePermission('sites.edit'), validate(updateSiteValidator), SiteController.update);
router.delete('/:id', requirePermission('sites.edit'), SiteController.remove);

export default router;
