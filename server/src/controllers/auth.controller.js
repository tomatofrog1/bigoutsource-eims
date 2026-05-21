import { AuthService } from '../services/auth.service.js';
import { success } from '../utils/apiResponse.js';

export const AuthController = {
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
      return success(res, AuthService.me(req.user));
    } catch (error) {
      return next(error);
    }
  },

  async logout(req, res) {
    return success(res, null, 'Logged out');
  },
};
