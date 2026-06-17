import { SettingsService } from './settings.service.js';
import { success } from '../../utils/apiResponse.js';

export const SettingsController = {
  async get(req, res, next) {
    try {
      return success(res, await SettingsService.get());
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      return success(res, await SettingsService.update(req.body), 'Settings saved');
    } catch (error) {
      return next(error);
    }
  },
};
