import { Router } from 'express';
import { EmployeeController } from './employee.controller.js';
import { requirePermission, requireAnyPermission } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createEmployeeValidator, updateEmployeeValidator } from './employee.validator.js';

const router = Router();

router.get('/', requirePermission('employees.view'), EmployeeController.list);
router.get('/summary', requirePermission('employees.view'), EmployeeController.summary);
router.get('/:id', requirePermission('employees.view'), EmployeeController.get);
router.post('/', requirePermission('employees.create'), validate(createEmployeeValidator), EmployeeController.create);
// Any tier of edit may PATCH; the service filters the payload to the fields the user owns.
router.put(
  '/:id',
  requireAnyPermission(['employees.edit', 'employees.it.edit', 'employees.secrets.edit', 'employees.delete']),
  validate(updateEmployeeValidator),
  EmployeeController.update
);
router.delete('/:id', requirePermission('employees.delete'), EmployeeController.remove);

export default router;
