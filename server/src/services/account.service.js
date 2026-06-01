import { AccountModel } from '../models/account.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { AppError } from '../utils/apiResponse.js';
import { auditActor } from '../utils/auditActor.js';
import { sanitizeDepartmentCode, suggestDepartmentCode } from '../utils/employeeIdentity.js';

const ACCOUNT_TYPES = ['internal', 'external'];

function normalizeType(value) {
  const next = String(value || '').trim().toLowerCase();
  if (!ACCOUNT_TYPES.includes(next)) throw new AppError('accountType must be internal or external', 400);
  return next;
}

export const AccountService = {
  list(filters = {}) {
    return AccountModel.findAll({
      search: filters.search,
      type: filters.type,
    });
  },

  recent(limit) {
    return AccountModel.findRecent(limit);
  },

  async create(data, user, meta = {}) {
    const name = String(data.name || '').trim();
    if (!name) throw new AppError('name is required', 400);

    const accountType = normalizeType(data.accountType || data.account_type);
    const departmentCode = sanitizeDepartmentCode(data.departmentCode || data.department_code || suggestDepartmentCode(name));

    if (!departmentCode) throw new AppError('departmentCode is required', 400);

    const existingCode = await AccountModel.findByDepartmentCode(departmentCode);
    if (existingCode) {
      throw new AppError('Department code already exists. Enter a unique letters-only code.', 409);
    }

    const account = await AccountModel.create({
      name,
      accountType,
      departmentCode,
    });

    await AuditLogModel.create({
      ...auditActor(user),
      action: 'account.create',
      entityType: 'accounts',
      entityId: account.id,
      details: { name: account.name, accountType: account.accountType, departmentCode: account.departmentCode },
      ipAddress: meta.ipAddress,
    });

    return account;
  },

  touch(id) {
    return AccountModel.touch(id);
  },
};
