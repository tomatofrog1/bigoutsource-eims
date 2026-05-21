import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createEmployeeValidator, updateEmployeeValidator } from '../validators/employee.validator.js';

const router = Router();
const employeeManagers = ['super_admin', 'admin', 'hr_admin', 'it_admin'];

router.get('/', EmployeeController.list);
router.get('/:id', EmployeeController.get);
router.post('/', requireRole(employeeManagers), validate(createEmployeeValidator), EmployeeController.create);
router.put('/:id', requireRole(employeeManagers), validate(updateEmployeeValidator), EmployeeController.update);
router.delete('/:id', requireRole(employeeManagers), EmployeeController.remove);

export default router;
