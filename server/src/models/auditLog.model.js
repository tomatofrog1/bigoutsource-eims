import { randomUUID } from 'node:crypto';
import { supabaseRequest } from '../config/supabase.js';
import { UserProfileModel } from './userProfile.model.js';

function matchesText(value, search) {
  return String(value || '').toLowerCase().includes(String(search || '').toLowerCase());
}

function toDatabasePayload(log) {
  return {
    id: log.id || randomUUID(),
    user_id: log.userId || null,
    user_email: log.userEmail || 'System',
    user_name: log.userName || null,
    user_role: log.userRole || null,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId || null,
    entity_label: log.entityLabel || null,
    details: log.details || {},
    ip_address: log.ipAddress || null,
    user_agent: log.userAgent || null,
    created_at: log.createdAt || new Date().toISOString(),
  };
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email || 'System',
    userName: row.user_name || '',
    userRole: row.user_role || '',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label || '',
    details: row.details || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function isSystemActor(log) {
  return !log || log.userId === 'system' || log.userEmail === 'System';
}

function shouldUseProfileName(log) {
  return !isSystemActor(log) && (!log.userName || log.userName === log.userEmail);
}

async function enrichWithProfileName(log, cache = new Map()) {
  if (!shouldUseProfileName(log)) return log;

  const cacheKey = log.userId ? `id:${log.userId}` : `email:${log.userEmail}`;
  if (!cache.has(cacheKey)) {
    let profile = null;

    if (log.userId) {
      profile = await UserProfileModel.findById(log.userId).catch(() => null);
    }

    if (!profile && log.userEmail) {
      profile = await UserProfileModel.findByEmail(log.userEmail).catch(() => null);
    }

    cache.set(cacheKey, profile?.fullName || '');
  }

  const fullName = cache.get(cacheKey);
  return fullName ? { ...log, userName: fullName } : log;
}

export const AuditLogModel = {
  async create({
    userId,
    userEmail = 'System',
    userName = null,
    userRole = null,
    action,
    entityType,
    entityId = null,
    entityLabel = null,
    details = {},
    ipAddress = null,
    userAgent = null,
  }) {
    const enrichedLog = await enrichWithProfileName({
      userId,
      userEmail,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      entityLabel,
      details,
      ipAddress,
      userAgent,
    });

    const rows = await supabaseRequest('audit_logs', {
      method: 'POST',
      body: toDatabasePayload(enrichedLog),
    });

    return enrichWithProfileName(normalize(rows[0]));
  },

  async findAll(filters = {}) {
    const limit = Math.min(Number(filters.limit || 500), 1000);
    const searchParams = {
      select: '*',
      order: 'created_at.desc',
      limit: String(limit),
    };

    if (filters.entityType) searchParams.entity_type = `eq.${filters.entityType}`;
    if (filters.entityId) searchParams.entity_id = `eq.${filters.entityId}`;

    const rows = await supabaseRequest('audit_logs', { searchParams });
    const profileCache = new Map();
    const logs = await Promise.all(rows.map((row) => enrichWithProfileName(normalize(row), profileCache)));

    return logs
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
          matchesText(log.userName, filters.search) ||
          matchesText(log.userRole, filters.search) ||
          matchesText(log.entityLabel, filters.search) ||
          matchesText(log.userAgent, filters.search) ||
          matchesText(JSON.stringify(log.details), filters.search)
      )
      .slice(0, limit);
  },

  async findById(id) {
    const rows = await supabaseRequest('audit_logs', {
      searchParams: {
        select: '*',
        id: `eq.${id}`,
        limit: '1',
      },
    });
    if (!rows || rows.length === 0) return null;
    return enrichWithProfileName(normalize(rows[0]));
  },
};
