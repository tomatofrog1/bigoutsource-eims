import { UserService } from '../services/user.service.js';
import { success } from '../utils/apiResponse.js';

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
};
