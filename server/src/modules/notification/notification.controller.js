import { NotificationService } from './notification.service.js';
import { success } from '../../utils/apiResponse.js';

export const NotificationController = {
  async list(req, res, next) {
    try {
      const limit = Number.parseInt(req.query.limit, 10) || 30;
      return success(res, await NotificationService.listForUser(req.user, { limit }));
    } catch (error) {
      return next(error);
    }
  },

  async markAllRead(req, res, next) {
    try {
      return success(res, await NotificationService.markAllReadForUser(req.user), 'Notifications marked as read');
    } catch (error) {
      return next(error);
    }
  },

  async clearAll(req, res, next) {
    try {
      return success(res, await NotificationService.clearAllForUser(req.user), 'Notifications cleared');
    } catch (error) {
      return next(error);
    }
  },
};
