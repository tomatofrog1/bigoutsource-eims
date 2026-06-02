import { supabaseRequest } from '../config/supabase.js';
import { sanitizeDepartmentCode } from '../utils/employeeIdentity.js';

const ACCOUNT_TYPES = ['internal', 'external'];

function normalizeType(value) {
  const next = String(value || '').trim().toLowerCase();
  return ACCOUNT_TYPES.includes(next) ? next : 'external';
}

function blankToNull(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = String(value).trim();
  return next === '' ? null : next;
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name || '',
    accountType: row.account_type || 'external',
    account_type: row.account_type || 'external',
    departmentCode: row.department_code || '',
    department_code: row.department_code || '',
    lastUsedAt: row.last_used_at || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export const AccountModel = {
  async findAll({ search, type } = {}) {
    const searchParams = {
      select: '*',
      order: 'name.asc',
    };

    if (search) searchParams.name = `ilike.*${String(search).trim()}*`;
    if (type && ACCOUNT_TYPES.includes(type)) searchParams.account_type = `eq.${type}`;

    const rows = await supabaseRequest('accounts', { searchParams });
    return rows.map(normalize);
  },

  async findByName(name) {
    const rows = await supabaseRequest('accounts', {
      searchParams: {
        select: '*',
        name: `eq.${String(name || '').trim()}`,
        limit: '1',
      },
    });
    return normalize(rows[0]);
  },

  async findById(id) {
    const rows = await supabaseRequest('accounts', {
      searchParams: {
        select: '*',
        id: `eq.${id}`,
        limit: '1',
      },
    });
    return normalize(rows[0]);
  },

  async findByDepartmentCode(code) {
    const rows = await supabaseRequest('accounts', {
      searchParams: {
        select: '*',
        department_code: `eq.${sanitizeDepartmentCode(code)}`,
        limit: '1',
      },
    });
    return normalize(rows[0]);
  },

  async findRecent(limit = 4) {
    const rows = await supabaseRequest('accounts', {
      searchParams: {
        select: '*',
        order: 'last_used_at.desc.nullslast,created_at.desc',
        limit: String(limit),
      },
    });
    return rows.map(normalize);
  },

  async create(data) {
    const payload = {
      name: blankToNull(data.name),
      account_type: normalizeType(data.accountType || data.account_type),
      department_code: sanitizeDepartmentCode(data.departmentCode || data.department_code),
      last_used_at: new Date().toISOString(),
    };

    const rows = await supabaseRequest('accounts', {
      method: 'POST',
      body: payload,
    });
    return normalize(rows[0]);
  },

  async update(id, data) {
    const payload = {
      name: blankToNull(data.name),
      updated_at: new Date().toISOString(),
    };
    const departmentCode = data.departmentCode ?? data.department_code;
    if (departmentCode !== undefined) payload.department_code = sanitizeDepartmentCode(departmentCode);

    const rows = await supabaseRequest('accounts', {
      method: 'PATCH',
      searchParams: {
        id: `eq.${id}`,
      },
      body: payload,
    });
    return normalize(rows[0]);
  },

  async remove(id) {
    const rows = await supabaseRequest('accounts', {
      method: 'DELETE',
      searchParams: {
        id: `eq.${id}`,
      },
    });
    return Array.isArray(rows) && rows.length > 0;
  },

  async touch(id) {
    const rows = await supabaseRequest('accounts', {
      method: 'PATCH',
      searchParams: {
        id: `eq.${id}`,
      },
      body: {
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    return normalize(rows[0]);
  },
};
