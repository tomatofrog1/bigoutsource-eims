import { Router } from 'express';
import { EmployeeImportController } from '../controllers/employeeImport.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const importManagers = ['super_admin', 'admin', 'hr_admin'];

router.get('/summary', EmployeeImportController.summary);
router.get('/', requireRole(importManagers), EmployeeImportController.list);
router.post('/stage', requireRole(importManagers), EmployeeImportController.stage);
router.post('/duplicates/resolve', requireRole(importManagers), EmployeeImportController.resolveDuplicate);
router.put('/rows/:id', requireRole(importManagers), EmployeeImportController.updateRow);
router.delete('/rows/:id', requireRole(importManagers), EmployeeImportController.deleteRow);
router.post('/delete-many', requireRole(importManagers), EmployeeImportController.deleteMany);
router.post('/:importBatchId/import-ready', requireRole(importManagers), EmployeeImportController.importReady);

export default router;
