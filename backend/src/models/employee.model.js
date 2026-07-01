import { prisma } from '../config/db.js';
import { generateLmsAccount } from '../utils/lmsAccount.js';

export const SITE_OPTIONS = ['HQ', 'Candelaria', 'WFH', 'Hybrid'];
export const STATUS_OPTIONS = ['active', 'pending', 'separated', 'floating'];
export const ESET_OPTIONS = ['active', 'inactive'];
export const ACTIVITY_WATCH_OPTIONS = ['active', 'inactive'];

function undefinedIfBlank(value) {
  if (value === undefined || value === null) return undefined;
  const next = String(value).trim();
  return next === '' ? undefined : next;
}

function stringOrEmpty(value) {
  if (value === undefined) return undefined;
  if (value === null) return '';
  return String(value).trim();
}

function toBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const next = String(value).trim().toLowerCase();
  if (next === 'true') return true;
  if (next === 'false') return false;
  return Boolean(value);
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
  if (next === 'hq' || next === 'san pablo' || next === 'san pablo city' || next === 'san pablo (hq)' || next === 'san pablo city (hq)') return 'HQ';
  
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
  const idRaw = valueFrom(data, 'id', 'employeeId', 'employeeNumber');
  const id = undefinedIfBlank(idRaw);
  const name = stringOrEmpty(valueFrom(data, 'name', 'fullName'));
  const account = stringOrEmpty(valueFrom(data, 'account', 'accountAssignment'));
  const site = stringOrEmpty(valueFrom(data, 'site', 'siteName', 'siteId'));
  const lmsRaw = valueFrom(data, 'lmsAccount', 'lms_account');
  const lmsAccount = lmsRaw !== undefined
    ? stringOrEmpty(lmsRaw)
    : (name !== undefined ? generateLmsAccount(name || '') : undefined);

  if (includeId || id !== undefined) payload.id = id;
  if (name !== undefined) payload.name = name;
  if (account !== undefined) payload.account = account;
  if (valueFrom(data, 'phone', 'phoneNumber') !== undefined) payload.phone_number = stringOrEmpty(valueFrom(data, 'phone', 'phoneNumber'));
  if (data?.address !== undefined) payload.address = stringOrEmpty(data.address);
  if (valueFrom(data, 'boEmail', 'bigoutsourceEmail') !== undefined) {
    payload.bigoutsource_email = stringOrEmpty(valueFrom(data, 'boEmail', 'bigoutsourceEmail'));
  }
  if (data?.emailPassword !== undefined) payload.email_password = stringOrEmpty(data.emailPassword);
  if (data?.avatarUrl !== undefined) payload.avatar_url = stringOrEmpty(data.avatarUrl);
  if (lmsAccount !== undefined) payload.lms_account = lmsAccount;
  if (data?.status !== undefined) payload.status = canonical(data.status, STATUS_OPTIONS, data.status);
  if (site !== undefined) payload.site = normalizeSite(site);
  if (data?.pcName !== undefined) payload.pc_name = stringOrEmpty(data.pcName);
  if (valueFrom(data, 'rustdeskId', 'rustDeskId') !== undefined) {
    payload.rustdesk_id = stringOrEmpty(valueFrom(data, 'rustdeskId', 'rustDeskId'));
  }
  if (data?.esetStatus !== undefined) payload.eset = normalizeEset(data.esetStatus);
  if (data?.biosDate !== undefined) payload.bios_date = stringOrEmpty(data.biosDate);
  if (data?.activityWatchStatus !== undefined) {
    payload.activitywatch = canonical(data.activityWatchStatus, ACTIVITY_WATCH_OPTIONS, data.activityWatchStatus);
  }
  if (valueFrom(data, 'windowsKey', 'windowsLicenseKey') !== undefined) {
    payload.windows_license_key = stringOrEmpty(valueFrom(data, 'windowsKey', 'windowsLicenseKey'));
  }
  const isArchived = valueFrom(data, 'is_archived', 'isArchived');
  if (isArchived !== undefined) {
    payload.is_archived = toBoolean(isArchived);
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
    phone: row.phoneNumber || row.phone_number || '',
    phoneNumber: row.phoneNumber || row.phone_number || '',
    address: row.address || '',
    boEmail: row.bigoutsourceEmail || row.bigoutsource_email || '',
    bigoutsourceEmail: row.bigoutsourceEmail || row.bigoutsource_email || '',
    emailPassword: row.emailPassword || row.email_password || '',
    lmsAccount: row.lmsAccount || row.lms_account || '',
    status: row.status || 'active',
    siteId: row.site || '',
    site: row.site || '',
    pcName: row.pcName || row.pc_name || '',
    biosDate: row.biosDate || row.bios_date || '',
    windowsKey: row.windowsLicenseKey || row.windows_license_key || '',
    windowsLicenseKey: row.windowsLicenseKey || row.windows_license_key || '',
    rustdeskId: row.rustdeskId || row.rustdesk_id || '',
    rustDeskId: row.rustdeskId || row.rustdesk_id || '',
    esetStatus: row.eset || 'inactive',
    eset: row.eset || 'inactive',
    activityWatchStatus: row.activitywatch || 'missing',
    activitywatch: row.activitywatch || 'missing',
    isArchived: row.isArchived ?? row.is_archived ?? false,
    avatarUrl: row.avatarUrl || row.avatar_url || null,
    createdAt: row.createdAt || row.created_at || '',
    updatedAt: row.updatedAt || row.updated_at || '',
  };
}

export const EmployeeModel = {
  async findAll() {
    const rows = await prisma.employee.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map(normalize);
  },

  async findSimilarIdentities(baseIdentifier, lmsBase) {
    const OR = [];
    if (baseIdentifier) {
      OR.push({ bigoutsourceEmail: { startsWith: baseIdentifier, mode: 'insensitive' } });
      OR.push({ pcName: { contains: `-${baseIdentifier}`, mode: 'insensitive' } });
    }
    if (lmsBase) {
      OR.push({ lmsAccount: { startsWith: lmsBase, mode: 'insensitive' } });
    }

    if (OR.length === 0) return [];

    const rows = await prisma.employee.findMany({
      where: { OR },
      select: { id: true, bigoutsourceEmail: true, pcName: true, lmsAccount: true },
    });
    return rows.map(normalize);
  },

  async findById(id) {
    const row = await prisma.employee.findUnique({
      where: { id },
    });
    return normalize(row);
  },

  async findByIdsOrNames(ids = [], names = []) {
    if (ids.length === 0 && names.length === 0) return [];
    
    const OR = [];
    if (ids.length > 0) {
      OR.push({ id: { in: ids } });
    }
    if (names.length > 0) {
      for (const name of names) {
        OR.push({ name: { equals: name, mode: 'insensitive' } });
      }
    }

    const rows = await prisma.employee.findMany({
      where: { OR },
      select: { id: true, name: true },
    });
    return rows.map(normalize);
  },

  async countInactiveUnarchived() {
    return prisma.employee.count({
      where: {
        status: 'inactive',
        isArchived: false,
      },
    });
  },

  async create(data) {
    const payload = toDatabasePayload(data, { includeId: true });
    // mapping payload to prisma format
    const createData = {
      id: payload.id,
      name: payload.name,
      account: payload.account,
      phoneNumber: payload.phone_number,
      address: payload.address,
      bigoutsourceEmail: payload.bigoutsource_email,
      emailPassword: payload.email_password,
      lmsAccount: payload.lms_account,
      status: payload.status,
      site: payload.site,
      pcName: payload.pc_name,
      rustdeskId: payload.rustdesk_id,
      eset: payload.eset,
      biosDate: payload.bios_date,
      activitywatch: payload.activitywatch,
      windowsLicenseKey: payload.windows_license_key,
      isArchived: payload.is_archived,
      avatarUrl: payload.avatar_url,
    };
    
    // remove undefined
    Object.keys(createData).forEach(key => createData[key] === undefined ? delete createData[key] : {});

    const row = await prisma.employee.create({
      data: createData,
    });
    return normalize(row);
  },

  async insertMany(dataArray) {
    if (!dataArray || dataArray.length === 0) return [];
    const payloads = dataArray.map(data => {
      const payload = toDatabasePayload(data, { includeId: true });
      const createData = {
        id: payload.id,
        name: payload.name,
        account: payload.account,
        phoneNumber: payload.phone_number,
        address: payload.address,
        bigoutsourceEmail: payload.bigoutsource_email,
        emailPassword: payload.email_password,
        lmsAccount: payload.lms_account,
        status: payload.status,
        site: payload.site,
        pcName: payload.pc_name,
        rustdeskId: payload.rustdesk_id,
        eset: payload.eset,
        biosDate: payload.bios_date,
        activitywatch: payload.activitywatch,
        windowsLicenseKey: payload.windows_license_key,
        isArchived: payload.is_archived,
        avatarUrl: payload.avatar_url,
      };
      Object.keys(createData).forEach(key => createData[key] === undefined ? delete createData[key] : {});
      return createData;
    });

    const result = await prisma.employee.createMany({
      data: payloads,
      skipDuplicates: true,
    });
    
    // If we need the actual rows back, we'd have to find them. Assuming insertMany result count is enough or we fetch them all.
    // The previous implementation mapped the result. `createMany` just returns `{ count: number }` in Prisma.
    // For now we'll return an empty array or fetch them if really needed, but `insertMany` callers usually don't need full returns.
    return []; 
  },

  async update(id, data) {
    const payload = toDatabasePayload(data);
    const updateData = {
      name: payload.name,
      account: payload.account,
      phoneNumber: payload.phone_number,
      address: payload.address,
      bigoutsourceEmail: payload.bigoutsource_email,
      emailPassword: payload.email_password,
      lmsAccount: payload.lms_account,
      status: payload.status,
      site: payload.site,
      pcName: payload.pc_name,
      rustdeskId: payload.rustdesk_id,
      eset: payload.eset,
      biosDate: payload.bios_date,
      activitywatch: payload.activitywatch,
      windowsLicenseKey: payload.windows_license_key,
      isArchived: payload.is_archived,
      avatarUrl: payload.avatar_url,
    };
    Object.keys(updateData).forEach(key => updateData[key] === undefined ? delete updateData[key] : {});

    const row = await prisma.employee.update({
      where: { id },
      data: updateData,
    });
    return normalize(row);
  },

  async remove(id) {
    await prisma.employee.delete({
      where: { id },
    });
    return true;
  },
};
