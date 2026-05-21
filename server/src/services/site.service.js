import { SiteModel } from '../models/site.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { AppError } from '../utils/apiResponse.js';

export const SiteService = {
  list() {
    return SiteModel.findAll();
  },

  async create(data, user, meta = {}) {
    const site = await SiteModel.create(data);
    await AuditLogModel.create({
      userId: user?.id || 'system',
      userEmail: user?.email || 'System',
      action: 'site.create',
      entityType: 'sites',
      entityId: site.id,
      details: { name: site.name },
      ipAddress: meta.ipAddress,
    });
    return site;
  },

  async update(id, data, user, meta = {}) {
    const site = await SiteModel.update(id, data);
    if (!site) throw new AppError('Site not found', 404);
    await AuditLogModel.create({
      userId: user?.id || 'system',
      userEmail: user?.email || 'System',
      action: 'site.update',
      entityType: 'sites',
      entityId: id,
      ipAddress: meta.ipAddress,
    });
    return site;
  },

  async remove(id, user, meta = {}) {
    const removed = await SiteModel.remove(id);
    if (!removed) throw new AppError('Site not found', 404);
    await AuditLogModel.create({
      userId: user?.id || 'system',
      userEmail: user?.email || 'System',
      action: 'site.delete',
      entityType: 'sites',
      entityId: id,
      ipAddress: meta.ipAddress,
    });
  },
};
