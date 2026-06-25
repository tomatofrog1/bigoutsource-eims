import { prisma } from '../config/db.js';
import { sanitizeDepartmentCode } from '../utils/employeeIdentity.js';

const ACCOUNT_TYPES = ['internal', 'external'];

function normalizeType(value) {
  const next = String(value || '').trim().toLowerCase();
  return ACCOUNT_TYPES.includes(next) ? next : 'external';
}

function stringOrEmpty(value) {
  if (value === undefined) return undefined;
  if (value === null) return '';
  return String(value).trim();
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name || '',
    accountType: row.accountType || 'external',
    account_type: row.accountType || 'external',
    departmentCode: row.departmentCode || '',
    department_code: row.departmentCode || '',
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : '',
    createdAt: row.createdAt ? row.createdAt.toISOString() : '',
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : '',
  };
}

export const AccountModel = {
  async findAll({ search, type } = {}) {
    const where = {};
    if (search) where.name = { contains: String(search).trim(), mode: 'insensitive' };
    if (type && ACCOUNT_TYPES.includes(type)) where.accountType = type;

    const rows = await prisma.account.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(normalize);
  },

  async findByName(name) {
    const row = await prisma.account.findUnique({
      where: { name: String(name || '').trim() },
    });
    return normalize(row);
  },

  async findById(id) {
    const row = await prisma.account.findUnique({
      where: { id },
    });
    return normalize(row);
  },

  async findByDepartmentCode(code) {
    const row = await prisma.account.findFirst({
      where: { departmentCode: sanitizeDepartmentCode(code) },
    });
    return normalize(row);
  },

  async findRecent(limit = 4) {
    const rows = await prisma.account.findMany({
      orderBy: [
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Number(limit) || 4,
    });
    return rows.map(normalize);
  },

  async create(data) {
    const row = await prisma.account.create({
      data: {
        name: stringOrEmpty(data.name),
        accountType: normalizeType(data.accountType || data.account_type),
        departmentCode: sanitizeDepartmentCode(data.departmentCode || data.department_code),
        lastUsedAt: new Date(),
      },
    });
    return normalize(row);
  },

  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = stringOrEmpty(data.name);

    const accountType = data.accountType ?? data.account_type;
    if (accountType !== undefined) updateData.accountType = normalizeType(accountType);

    const departmentCode = data.departmentCode ?? data.department_code;
    if (departmentCode !== undefined) updateData.departmentCode = sanitizeDepartmentCode(departmentCode);

    const row = await prisma.account.update({
      where: { id },
      data: updateData,
    });
    return normalize(row);
  },

  async remove(id) {
    await prisma.account.delete({ where: { id } });
    return true;
  },

  async touch(id) {
    const row = await prisma.account.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
    return normalize(row);
  },
};
