import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller.js';

const router = Router();

router.get('/', AuditLogController.list);

export default router;
