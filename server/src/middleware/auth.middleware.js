import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      id: payload.sub,
      email: payload.email || env.admin.email,
      status: 'active',
      site: payload.site || 'HQ',
      siteId: payload.site || 'HQ',
      roles: payload.roles || [payload.role || 'viewer'],
      role: payload.role || payload.roles?.[0] || 'viewer',
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }

    return next(error);
  }
}
