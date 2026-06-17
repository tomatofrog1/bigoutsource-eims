import { DeviceService } from './device.service.js';
import { success } from '../../utils/apiResponse.js';

export const DeviceController = {
  async list(req, res, next) {
    try {
      return success(res, await DeviceService.list());
    } catch (error) {
      return next(error);
    }
  },

  async get(req, res, next) {
    try {
      return success(res, await DeviceService.get(req.params.id));
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      return success(res, await DeviceService.create(req.body, req.user, { ipAddress: req.ip }), 'Device created', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(res, await DeviceService.update(req.params.id, req.body, req.user, { ipAddress: req.ip }), 'Device updated');
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await DeviceService.remove(req.params.id, req.user, { ipAddress: req.ip });
      return success(res, null, 'Device deleted');
    } catch (error) {
      return next(error);
    }
  },

  async assign(req, res, next) {
    try {
      return success(res, await DeviceService.assign(req.body, req.user, { ipAddress: req.ip }), 'Device assigned', 201);
    } catch (error) {
      return next(error);
    }
  },

  async returnAssignment(req, res, next) {
    try {
      return success(res, await DeviceService.returnAssignment(req.params.id, req.user, { ipAddress: req.ip }), 'Device returned');
    } catch (error) {
      return next(error);
    }
  },
};
