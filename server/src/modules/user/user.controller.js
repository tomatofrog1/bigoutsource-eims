import { UserService } from './user.service.js';
import { success } from '../../utils/apiResponse.js';

export const UserController = {
  async list(req, res, next) {
    try {
      return success(res, await UserService.list(req.query));
    } catch (error) {
      return next(error);
    }
  },

  async approve(req, res, next) {
    try {
      return success(res, await UserService.approve(req.params.id, req.user), 'User approved');
    } catch (error) {
      return next(error);
    }
  },

  async disable(req, res, next) {
    try {
      return success(res, await UserService.disable(req.params.id), 'User disabled');
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(res, await UserService.update(req.params.id, req.body, req.user), 'User updated');
    } catch (error) {
      return next(error);
    }
  },

  async setCapabilities(req, res, next) {
    try {
      const value = req.body?.capabilities;
      const capabilities = value === null ? null : value;
      return success(res, await UserService.setCapabilities(req.params.id, capabilities), 'Permissions updated');
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      return success(res, await UserService.remove(req.params.id), 'User deleted');
    } catch (error) {
      return next(error);
    }
  },
};
