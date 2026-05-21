import { Router } from 'express';
import { SiteController } from '../controllers/site.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createSiteValidator, updateSiteValidator } from '../validators/site.validator.js';

const router = Router();

router.get('/', SiteController.list);
router.post('/', validate(createSiteValidator), SiteController.create);
router.put('/:id', validate(updateSiteValidator), SiteController.update);
router.delete('/:id', SiteController.remove);

export default router;
