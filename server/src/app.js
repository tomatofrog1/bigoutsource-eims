import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import employeeRoutes from './modules/employee/employee.routes.js';
import deviceRoutes, { assignmentRouter } from './modules/device/device.routes.js';
import siteRoutes from './modules/site/site.routes.js';
import auditLogRoutes from './modules/auditLog/auditLog.routes.js';
import accountRoutes from './modules/account/account.routes.js';
import userRoutes from './modules/user/user.routes.js';
import roleRoutes from './modules/role/role.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import employeeImportRoutes from './modules/employeeImport/employeeImport.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import { authenticate, requirePermission } from './middleware/auth.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();
const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):30\d{2}$/;

function resolveCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (env.corsOrigins.includes(origin) || (env.nodeEnv === 'development' && localDevOriginPattern.test(origin))) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authenticate, accountRoutes);
app.use('/api/employees', authenticate, employeeRoutes);
app.use('/api/employee-imports', authenticate, employeeImportRoutes);
app.use('/api/sites', authenticate, siteRoutes);
app.use('/api/devices', authenticate, deviceRoutes);
app.use('/api/device-assignments', authenticate, assignmentRouter);
app.use('/api/audit-logs', authenticate, auditLogRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/users', authenticate, requirePermission('users.manage'), userRoutes);
app.use('/api/roles', authenticate, roleRoutes);
app.use('/api/settings', authenticate, requirePermission('settings.manage'), settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
