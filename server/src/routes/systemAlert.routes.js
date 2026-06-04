import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createAlert, getUnreadAlerts, markAsRead } from '../controllers/systemAlert.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

const alertLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 alert creation requests per windowMs
  message: { success: false, message: 'Too many alerts created from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public route to create alerts (e.g. from the login page)
router.post('/', alertLimiter, createAlert);

// Protected routes for admins/super_admins
router.get('/', authenticate, requireRole(['admin', 'super_admin']), getUnreadAlerts);
router.put('/:id/read', authenticate, requireRole(['admin', 'super_admin']), markAsRead);

export default router;
