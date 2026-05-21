import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { assignDeviceValidator, createDeviceValidator, updateDeviceValidator } from '../validators/device.validator.js';

const router = Router();
const assignmentRouter = Router();
const deviceManagers = ['super_admin', 'admin', 'it_admin'];

router.get('/', DeviceController.list);
router.get('/:id', DeviceController.get);
router.post('/', requireRole(deviceManagers), validate(createDeviceValidator), DeviceController.create);
router.put('/:id', requireRole(deviceManagers), validate(updateDeviceValidator), DeviceController.update);
router.delete('/:id', requireRole(deviceManagers), DeviceController.remove);

assignmentRouter.post('/', requireRole(deviceManagers), validate(assignDeviceValidator), DeviceController.assign);
assignmentRouter.put('/:id/return', requireRole(deviceManagers), DeviceController.returnAssignment);

export { assignmentRouter };
export default router;
