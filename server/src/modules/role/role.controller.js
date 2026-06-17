import { RoleService } from './role.service.js';
import { success } from '../../utils/apiResponse.js';

export const RoleController = {
  async list(req, res, next) {
    try {
      return success(res, await RoleService.list());
    } catch (error) {
      return next(error);
    }
  },

  async catalog(req, res, next) {
    try {
      return success(res, RoleService.catalog());
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      return success(res, await RoleService.create(req.body), 'Role created', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(res, await RoleService.update(req.params.slug, req.body), 'Role updated');
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await RoleService.remove(req.params.slug);
      return success(res, null, 'Role deleted');
    } catch (error) {
      return next(error);
    }
  },
};
