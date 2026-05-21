import { supabaseRequest } from '../config/supabase.js';

export const USER_ROLES = ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'];
export const USER_STATUSES = ['pending', 'active', 'disabled'];

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    fullName: row.full_name || '',
    role: row.role || 'viewer',
    roles: [row.role || 'viewer'],
    status: row.status || 'pending',
    department: row.department || 'Unassigned',
    site: row.site || 'HQ',
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function toDatabasePayload(data) {
  const payload = {};

  if (data.id !== undefined) payload.id = data.id;
  if (data.email !== undefined) payload.email = String(data.email).trim().toLowerCase();
  if (data.fullName !== undefined) payload.full_name = String(data.fullName).trim();
  if (data.role !== undefined) payload.role = data.role;
  if (data.status !== undefined) payload.status = data.status;
  if (data.department !== undefined) payload.department = String(data.department || 'Unassigned').trim() || 'Unassigned';
  if (data.site !== undefined) payload.site = String(data.site || 'HQ').trim() || 'HQ';
  if (data.approvedBy !== undefined) payload.approved_by = data.approvedBy;
  if (data.approvedAt !== undefined) payload.approved_at = data.approvedAt;

  return payload;
}

export const UserProfileModel = {
  async findAll(filters = {}) {
    const searchParams = {
      select: '*',
      order: 'created_at.desc',
    };

    if (filters.status) searchParams.status = `eq.${filters.status}`;

    const rows = await supabaseRequest('user_profiles', { searchParams });
    return rows.map(normalize);
  },

  async findById(id) {
    const rows = await supabaseRequest('user_profiles', {
      searchParams: {
        select: '*',
        id: `eq.${id}`,
        limit: '1',
      },
    });
    return normalize(rows[0]);
  },

  async findByEmail(email) {
    const rows = await supabaseRequest('user_profiles', {
      searchParams: {
        select: '*',
        email: `eq.${String(email).trim().toLowerCase()}`,
        limit: '1',
      },
    });
    return normalize(rows[0]);
  },

  async create(data) {
    const rows = await supabaseRequest('user_profiles', {
      method: 'POST',
      body: toDatabasePayload(data),
    });
    return normalize(rows[0]);
  },

  async update(id, data) {
    const rows = await supabaseRequest('user_profiles', {
      method: 'PATCH',
      searchParams: {
        id: `eq.${id}`,
      },
      body: toDatabasePayload(data),
    });
    return normalize(rows[0]);
  },
};
