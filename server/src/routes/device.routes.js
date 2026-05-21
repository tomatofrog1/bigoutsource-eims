import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { assignDeviceValidator, createDeviceValidator, updateDeviceValidator } from '../validators/device.validator.js';

const router = Router();
const assignmentRouter = Router();

router.get('/', DeviceController.list);
router.get('/:id', DeviceController.get);
router.post('/', validate(createDeviceValidator), DeviceController.create);
router.put('/:id', validate(updateDeviceValidator), DeviceController.update);
router.delete('/:id', DeviceController.remove);

assignmentRouter.post('/', validate(assignDeviceValidator), DeviceController.assign);
assignmentRouter.put('/:id/return', DeviceController.returnAssignment);

export { assignmentRouter };
export default router;
