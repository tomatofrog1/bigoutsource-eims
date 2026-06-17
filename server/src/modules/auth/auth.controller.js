import { AuthService } from './auth.service.js';
import { AccountService } from '../account/account.service.js';
import { success } from '../../utils/apiResponse.js';

export const AuthController = {
  async internalDepartments(req, res, next) {
    try {
      const accounts = await AccountService.list({ type: 'internal' });
      return success(res, accounts.map((account) => account.name).filter(Boolean));
    } catch (error) {
      return next(error);
    }
  },

  async register(req, res, next) {
    try {
      const data = await AuthService.register(req.body, { ipAddress: req.ip });
      return success(res, data, 'Account request submitted', 201);
    } catch (error) {
      return next(error);
    }
  },

  async login(req, res, next) {
    try {
      const data = await AuthService.login(req.body, { ipAddress: req.ip });
      return success(res, data, 'Logged in');
    } catch (error) {
      return next(error);
    }
  },

  async me(req, res, next) {
    try {
      return success(res, await AuthService.me(req.user));
    } catch (error) {
      return next(error);
    }
  },

  async logout(req, res) {
    return success(res, null, 'Logged out');
  },

  async changePassword(req, res, next) {
    try {
      return success(res, await AuthService.changePassword(req.user, req.body), 'Password changed');
    } catch (error) {
      return next(error);
    }
  },
};
