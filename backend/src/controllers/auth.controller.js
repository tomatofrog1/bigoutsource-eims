import { AuthService } from '../services/auth.service.js';
import { AccountService } from '../services/account.service.js';
import { success } from '../utils/apiResponse.js';

export const AuthController = {
  async internalDepartments(req, res, next) {
    try {
      const accounts = await AccountService.list({ type: 'internal' });
      return success(res, accounts.map((account) => account.name).filter(Boolean));
    } catch (error) {
      return next(error);
    }
  },

  async checkEmail(req, res, next) {
    try {
      const data = await AuthService.checkEmail(req.body.email);
      return success(res, data, 'Email check complete');
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
      return success(res, data, data.requiresMfa ? 'MFA required' : 'Logged in');
    } catch (error) {
      return next(error);
    }
  },

  async loginMfa(req, res, next) {
    try {
      const data = await AuthService.loginMfa(req.body);
      return success(res, data, 'MFA successful, logged in');
    } catch (error) {
      return next(error);
    }
  },

  async resendLoginMfa(req, res, next) {
    try {
      const data = await AuthService.resendLoginMfa(req.body);
      return success(res, data, 'New MFA code sent');
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
