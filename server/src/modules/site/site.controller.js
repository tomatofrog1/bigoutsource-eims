import { SiteService } from './site.service.js';
import { success } from '../../utils/apiResponse.js';

export const SiteController = {
  async list(req, res, next) {
    try {
      return success(res, await SiteService.list());
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      return success(res, await SiteService.create(req.body, req.user, { ipAddress: req.ip }), 'Site created', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(res, await SiteService.update(req.params.id, req.body, req.user, { ipAddress: req.ip }), 'Site updated');
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await SiteService.remove(req.params.id, req.user, { ipAddress: req.ip });
      return success(res, null, 'Site deleted');
    } catch (error) {
      return next(error);
    }
  },
};
