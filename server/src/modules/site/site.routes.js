import { Router } from 'express';
import { SiteController } from './site.controller.js';

const router = Router();

// Sites are reference data — a fixed set of office locations used only to
// populate dropdowns. Any authenticated user may read the list (the router is
// mounted behind `authenticate`). There is no sites management UI, so the
// write endpoints were removed along with the sites.view / sites.edit
// capabilities.
router.get('/', SiteController.list);

export default router;
