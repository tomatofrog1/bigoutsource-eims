import { supabaseRequest } from '../../config/supabase.js';

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type || '',
    actorId: row.actor_id || null,
    actorName: row.actor_name || '',
    actorRole: row.actor_role || '',
    message: row.message || '',
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    entityLabel: row.entity_label || '',
    actionUrl: row.action_url || '',
    details: row.details || {},
    readAt: row.read_at || null,
    createdAt: row.created_at || '',
  };
}

function toDatabasePayload(data) {
  return {
    recipient_id: data.recipientId,
    type: data.type,
    actor_id: data.actorId || null,
    actor_name: data.actorName || null,
    actor_role: data.actorRole || null,
    message: data.message,
    entity_type: data.entityType,
    entity_id: data.entityId,
    entity_label: data.entityLabel || null,
    action_url: data.actionUrl || null,
    details: data.details || {},
  };
}

export const NotificationModel = {
  async findForRecipient(recipientId, { limit = 30 } = {}) {
    const rows = await supabaseRequest('notifications', {
      searchParams: {
        select: '*',
        recipient_id: `eq.${recipientId}`,
        order: 'created_at.desc',
        limit: String(limit),
      },
    });
    return rows.map(normalize);
  },

  async createMany(notifications) {
    if (!notifications.length) return [];

    const rows = await supabaseRequest('notifications', {
      method: 'POST',
      body: notifications.map(toDatabasePayload),
    });
    return rows.map(normalize);
  },

  async markAllReadForRecipient(recipientId) {
    const rows = await supabaseRequest('notifications', {
      method: 'PATCH',
      searchParams: {
        recipient_id: `eq.${recipientId}`,
        read_at: 'is.null',
      },
      body: { read_at: new Date().toISOString() },
    });
    return rows.map(normalize);
  },

  async clearAllForRecipient(recipientId) {
    const rows = await supabaseRequest('notifications', {
      method: 'DELETE',
      searchParams: {
        recipient_id: `eq.${recipientId}`,
      },
    });
    return rows.map(normalize);
  },
};
