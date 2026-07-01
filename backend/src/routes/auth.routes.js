import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changePasswordValidator, loginValidator, registerValidator } from '../utils/auth.validator.js';

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
router.post('/login/mfa', loginLimiter, AuthController.loginMfa);
router.get('/internal-departments', AuthController.internalDepartments);
router.get('/me', authenticate, AuthController.me);
router.post('/logout', authenticate, AuthController.logout);
router.put('/password', authenticate, validate(changePasswordValidator), AuthController.changePassword);
router.post('/mfa/setup', authenticate, AuthController.setupMfa);
router.post('/mfa/verify', authenticate, AuthController.verifyMfa);
router.post('/mfa/disable', authenticate, AuthController.disableMfa);

export default router;
