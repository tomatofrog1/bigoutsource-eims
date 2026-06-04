import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import deviceRoutes, { assignmentRouter } from './routes/device.routes.js';
import siteRoutes from './routes/site.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import accountRoutes from './routes/account.routes.js';
import userRoutes from './routes/user.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import employeeImportRoutes from './routes/employeeImport.routes.js';
import { authenticate, requireRole } from './middleware/auth.middleware.js';
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
app.use('/api/users', authenticate, requireRole('super_admin'), userRoutes);
app.use('/api/settings', authenticate, requireRole('super_admin'), settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
