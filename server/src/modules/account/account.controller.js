import { AccountService } from './account.service.js';
import { success } from '../../utils/apiResponse.js';

export const AccountController = {
  async list(req, res, next) {
    try {
      return success(res, await AccountService.list(req.query));
    } catch (error) {
      return next(error);
    }
  },

  async recent(req, res, next) {
    try {
      return success(res, await AccountService.recent(req.query.limit));
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      return success(res, await AccountService.create(req.body, req.user, { ipAddress: req.ip }), 'Account created', 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(res, await AccountService.update(req.params.id, req.body, req.user, { ipAddress: req.ip }), 'Account updated');
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await AccountService.remove(req.params.id, req.user, { ipAddress: req.ip });
      return success(res, null, 'Account deleted');
    } catch (error) {
      return next(error);
    }
  },

  async touch(req, res, next) {
    try {
      return success(res, await AccountService.touch(req.params.id), 'Account usage updated');
    } catch (error) {
      return next(error);
    }
  },
};
