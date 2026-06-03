import { supabaseRequest } from '../config/supabase.js';
import { generateLmsAccount } from '../utils/lmsAccount.js';

export const SITE_OPTIONS = ['HQ', 'Candelaria', 'WFH', 'Hybrid'];
export const STATUS_OPTIONS = ['active', 'inactive'];
export const ESET_OPTIONS = ['active', 'inactive'];
export const ACTIVITY_WATCH_OPTIONS = ['installed', 'missing'];

function blankToNull(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = String(value).trim();
  return next === '' ? null : next;
}

function valueFrom(data, ...keys) {
  for (const key of keys) {
    if (data?.[key] !== undefined) return data[key];
  }
  return undefined;
}

function canonical(value, allowed, fallback = value) {
  if (value === undefined || value === null || value === '') return value;
  const match = allowed.find((option) => option.toLowerCase() === String(value).trim().toLowerCase());
  return match || fallback;
}

function normalizeSite(value) {
  if (value === undefined || value === null || value === '') return value;
  const next = String(value).trim().toLowerCase();
  if (next === 'can' || next === 'cand' || next === 'candelaria') return 'Candelaria';
  if (next === 'wfh/hybrid' || next === 'hybrid') return 'Hybrid';
  if (next === 'wfh') return 'WFH';
  if (next === 'hq' || next === 'san pablo' || next === 'san pablo city' || next === 'san pablo city (hq)') return 'HQ';
  
  const match = SITE_OPTIONS.find((option) => option.toLowerCase() === next);
  return match || value;
}

function normalizeEset(value) {
  if (value === 'installed') return 'active';
  if (value === 'missing' || value === 'update_required') return 'inactive';
  return canonical(value, ESET_OPTIONS, value);
}

function toDatabasePayload(data, { includeId = false } = {}) {
  const payload = {};
  const id = blankToNull(valueFrom(data, 'id', 'employeeId', 'employeeNumber'));
  const name = blankToNull(valueFrom(data, 'name', 'fullName'));
  const account = blankToNull(valueFrom(data, 'account', 'accountAssignment'));
  const site = blankToNull(valueFrom(data, 'site', 'siteName', 'siteId'));
  const lmsAccount = name !== undefined ? generateLmsAccount(name || '') : blankToNull(valueFrom(data, 'lmsAccount', 'lms_account'));

  if (includeId || id !== undefined) payload.id = id;
  if (name !== undefined) payload.name = name;
  if (account !== undefined) payload.account = account;
  if (valueFrom(data, 'phone', 'phoneNumber') !== undefined) payload.phone_number = blankToNull(valueFrom(data, 'phone', 'phoneNumber'));
  if (data?.address !== undefined) payload.address = blankToNull(data.address);
  if (valueFrom(data, 'boEmail', 'bigoutsourceEmail') !== undefined) {
    payload.bigoutsource_email = blankToNull(valueFrom(data, 'boEmail', 'bigoutsourceEmail'));
  }
  if (data?.emailPassword !== undefined) payload.email_password = blankToNull(data.emailPassword);
  if (lmsAccount !== undefined) payload.lms_account = lmsAccount;
  if (data?.status !== undefined) payload.status = canonical(data.status, STATUS_OPTIONS, data.status);
  if (site !== undefined) payload.site = normalizeSite(site);
  if (data?.pcName !== undefined) payload.pc_name = blankToNull(data.pcName);
  if (valueFrom(data, 'rustdeskId', 'rustDeskId') !== undefined) {
    payload.rustdesk_id = blankToNull(valueFrom(data, 'rustdeskId', 'rustDeskId'));
  }
  if (data?.remoteId !== undefined) payload.remote_id = blankToNull(data.remoteId);
  if (data?.esetStatus !== undefined) payload.eset = normalizeEset(data.esetStatus);
  if (data?.biosDate !== undefined) payload.bios_date = blankToNull(data.biosDate);
  if (data?.activityWatchStatus !== undefined) {
    payload.activitywatch = canonical(data.activityWatchStatus, ACTIVITY_WATCH_OPTIONS, data.activityWatchStatus);
  }
  if (valueFrom(data, 'windowsKey', 'windowsLicenseKey') !== undefined) {
    payload.windows_license_key = blankToNull(valueFrom(data, 'windowsKey', 'windowsLicenseKey'));
  }
  if (data?.is_archived !== undefined) {
    payload.is_archived = data.is_archived;
  }
  return payload;
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.id,
    employeeNumber: row.id,
    fullName: row.name || '',
    name: row.name || '',
    account: row.account || '',
    accountAssignment: row.account || '',
    phone: row.phone_number || '',
    phoneNumber: row.phone_number || '',
    address: row.address || '',
    boEmail: row.bigoutsource_email || '',
    bigoutsourceEmail: row.bigoutsource_email || '',
    emailPassword: row.email_password || '',
    lmsAccount: row.lms_account || '',
    status: row.status || 'active',
    siteId: row.site || '',
    site: row.site || '',
    pcName: row.pc_name || '',
    biosDate: row.bios_date || '',
    windowsKey: row.windows_license_key || '',
    windowsLicenseKey: row.windows_license_key || '',
    rustdeskId: row.rustdesk_id || '',
    rustDeskId: row.rustdesk_id || '',
    remoteId: row.remote_id || '',
    esetStatus: row.eset || 'inactive',
    eset: row.eset || 'inactive',
    activityWatchStatus: row.activitywatch || 'missing',
    activitywatch: row.activitywatch || 'missing',
    isArchived: row.is_archived ?? false,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export const EmployeeModel = {
  async findAll() {
    const rows = await supabaseRequest('employees', {
      searchParams: {
        select: '*',
        order: 'id.asc',
      },
    });
    return rows.map(normalize);
  },

  async findById(id) {
    const rows = await supabaseRequest('employees', {
      searchParams: {
        select: '*',
        id: `eq.${id}`,
        limit: '1',
      },
    });
    return normalize(rows[0]);
  },

  async create(data) {
    const payload = toDatabasePayload(data, { includeId: true });
    const rows = await supabaseRequest('employees', {
      method: 'POST',
      body: payload,
    });
    return normalize(rows[0]);
  },

  async update(id, data) {
    const payload = toDatabasePayload(data);
    const rows = await supabaseRequest('employees', {
      method: 'PATCH',
      searchParams: {
        id: `eq.${id}`,
      },
      body: payload,
    });
    return normalize(rows[0]);
  },

  async remove(id) {
    const rows = await supabaseRequest('employees', {
      method: 'DELETE',
      searchParams: {
        id: `eq.${id}`,
      },
    });
    return Array.isArray(rows) && rows.length > 0;
  },
};
