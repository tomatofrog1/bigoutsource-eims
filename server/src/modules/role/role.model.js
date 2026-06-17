import { supabaseRequest } from '../../config/supabase.js';

function normalize(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name || '',
    isSystem: Boolean(row.is_system),
    capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export const RoleModel = {
  async findAll() {
    const rows = await supabaseRequest('roles', {
      searchParams: { select: '*', order: 'name.asc' },
    });
    return rows.map(normalize);
  },

  async findBySlug(slug) {
    const rows = await supabaseRequest('roles', {
      searchParams: { select: '*', slug: `eq.${slug}`, limit: '1' },
    });
    return normalize(rows[0]);
  },

  async create(data) {
    const rows = await supabaseRequest('roles', {
      method: 'POST',
      body: {
        slug: data.slug,
        name: data.name,
        is_system: Boolean(data.isSystem),
        capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
      },
    });
    return normalize(rows[0]);
  },

  async update(slug, data) {
    const payload = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) payload.name = data.name;
    if (data.capabilities !== undefined) payload.capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];

    const rows = await supabaseRequest('roles', {
      method: 'PATCH',
      searchParams: { slug: `eq.${slug}` },
      body: payload,
    });
    return normalize(rows[0]);
  },

  async remove(slug) {
    const rows = await supabaseRequest('roles', {
      method: 'DELETE',
      searchParams: { slug: `eq.${slug}` },
    });
    return Array.isArray(rows) && rows.length > 0;
  },
};
