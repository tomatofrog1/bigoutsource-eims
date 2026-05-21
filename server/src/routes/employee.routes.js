import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createEmployeeValidator, updateEmployeeValidator } from '../validators/employee.validator.js';

const router = Router();

router.get('/', EmployeeController.list);
router.get('/:id', EmployeeController.get);
router.post('/', validate(createEmployeeValidator), EmployeeController.create);
router.put('/:id', validate(updateEmployeeValidator), EmployeeController.update);
router.delete('/:id', EmployeeController.remove);

export default router;
