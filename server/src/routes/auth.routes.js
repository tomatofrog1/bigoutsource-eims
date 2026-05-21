import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginValidator, registerValidator } from '../validators/auth.validator.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

router.post('/register', validate(registerValidator), AuthController.register);
router.post('/login', loginLimiter, validate(loginValidator), AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/logout', authenticate, AuthController.logout);

export default router;
