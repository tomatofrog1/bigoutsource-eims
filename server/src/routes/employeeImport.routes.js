import { Router } from 'express';
import { EmployeeImportController } from '../controllers/employeeImport.controller.js';
import { requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', requirePermission('imports.manage'), EmployeeImportController.summary);
router.get('/', requirePermission('imports.manage'), EmployeeImportController.list);
router.post('/stage', requirePermission('imports.manage'), EmployeeImportController.stage);
router.post('/duplicates/resolve', requirePermission('imports.manage'), EmployeeImportController.resolveDuplicate);
router.delete('/rows', requirePermission('imports.manage'), EmployeeImportController.deleteRows);
router.put('/rows/:id', requirePermission('imports.manage'), EmployeeImportController.updateRow);
router.delete('/rows/:id', requirePermission('imports.manage'), EmployeeImportController.deleteRow);
router.post('/delete-many', requirePermission('imports.manage'), EmployeeImportController.deleteMany);
router.post('/:importBatchId/import-ready', requirePermission('imports.manage'), EmployeeImportController.importReady);

export default router;
