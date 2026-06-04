import SystemAlert from '../models/systemAlert.model.js';
import { success } from '../utils/apiResponse.js';

export const createAlert = async (req, res, next) => {
  try {
    const { type, message } = req.body;

    if (!type || !message) {
      const error = new Error('Type and message are required');
      error.statusCode = 400;
      throw error;
    }

    const alert = await SystemAlert.create({
      type,
      message,
      isRead: false,
    });

    return success(res, alert, 201);
  } catch (error) {
    return next(error);
  }
};

export const getUnreadAlerts = async (req, res, next) => {
  try {
    // Only fetching unread alerts for the notification panel
    const alerts = await SystemAlert.find({ isRead: false }).sort({ createdAt: -1 });

    return success(res, alerts);
  } catch (error) {
    return next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await SystemAlert.findById(id);

    if (!alert) {
      const error = new Error('Alert not found');
      error.statusCode = 404;
      throw error;
    }

    alert.isRead = true;
    await alert.save();

    return success(res, alert);
  } catch (error) {
    return next(error);
  }
};
