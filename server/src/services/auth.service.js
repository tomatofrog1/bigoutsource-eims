import { AuditLogModel } from '../models/auditLog.model.js';
import { generateToken } from '../utils/generateToken.js';
import { AppError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    site: user.site,
    siteId: user.siteId,
    roles: user.roles,
    role: user.roles[0] || 'viewer',
  };
}

export const AuthService = {
  async login({ email, password }, meta = {}) {
    if (!env.admin.password || email.toLowerCase() !== env.admin.email.toLowerCase() || password !== env.admin.password) {
      throw new AppError('Invalid email or password', 401);
    }

    const user = {
      id: 'admin',
      email: env.admin.email,
      status: 'active',
      site: 'HQ',
      siteId: 'HQ',
      roles: ['super_admin'],
    };

    const token = generateToken({ sub: user.id, email: user.email, roles: user.roles, role: user.roles[0], site: user.site });

    await AuditLogModel.create({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.login',
      entityType: 'users',
      entityId: user.id,
      ipAddress: meta.ipAddress,
    });

    return { token, user: publicUser(user) };
  },

  me(user) {
    return publicUser(user);
  },
};
