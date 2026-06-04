import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller.js';
import { requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requirePermission('auditlogs.view'), AuditLogController.list);
router.post('/:id/undo', requirePermission('auditlogs.undo'), AuditLogController.undo);

export default router;
