import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller.js';

const router = Router();

router.get('/', AuditLogController.list);
router.post('/:id/undo', AuditLogController.undo);

export default router;
