import { Router } from 'express';
import { DeviceController } from './device.controller.js';
import { requirePermission } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { assignDeviceValidator, createDeviceValidator, updateDeviceValidator } from './device.validator.js';

const router = Router();
const assignmentRouter = Router();

router.get('/', requirePermission('assets.view'), DeviceController.list);
router.get('/:id', requirePermission('assets.view'), DeviceController.get);
router.post('/', requirePermission('assets.edit'), validate(createDeviceValidator), DeviceController.create);
router.put('/:id', requirePermission('assets.edit'), validate(updateDeviceValidator), DeviceController.update);
router.delete('/:id', requirePermission('assets.edit'), DeviceController.remove);

assignmentRouter.post('/', requirePermission('assets.edit'), validate(assignDeviceValidator), DeviceController.assign);
assignmentRouter.put('/:id/return', requirePermission('assets.edit'), DeviceController.returnAssignment);

export { assignmentRouter };
export default router;
