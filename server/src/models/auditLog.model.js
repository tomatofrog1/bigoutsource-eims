import { randomUUID } from 'node:crypto';

const auditLogs = [];

function matchesText(value, search) {
  return String(value || '').toLowerCase().includes(String(search || '').toLowerCase());
}

export const AuditLogModel = {
  async create({ userId, userEmail = 'System', action, entityType, entityId = null, details = {}, ipAddress = null }) {
    const log = {
      id: randomUUID(),
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
      createdAt: new Date().toISOString(),
    };

    auditLogs.unshift(log);
    return log;
  },

  async findAll(filters = {}) {
    const limit = Math.min(Number(filters.limit || 500), 1000);

    return auditLogs
      .filter((log) => !filters.entityType || log.entityType === filters.entityType)
      .filter((log) => !filters.entityId || log.entityId === filters.entityId)
      .filter((log) => !filters.action || matchesText(log.action, filters.action))
      .filter((log) => !filters.userEmail || matchesText(log.userEmail, filters.userEmail))
      .filter(
        (log) =>
          !filters.search ||
          matchesText(log.action, filters.search) ||
          matchesText(log.entityType, filters.search) ||
          matchesText(log.userEmail, filters.search) ||
          matchesText(JSON.stringify(log.details), filters.search)
      )
      .slice(0, limit);
  },
};
