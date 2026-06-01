import { AccountModel } from '../models/account.model.js';
import { EmployeeModel } from '../models/employee.model.js';
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

  async update(id, data, user, meta = {}) {
    const before = await AccountModel.findById(id);
    if (!before) throw new AppError('Account not found', 404);

    const name = String(data.name || '').trim();
    if (!name) throw new AppError('name is required', 400);

    const account = await AccountModel.update(id, {
      name,
      accountType: data.accountType || data.account_type || before.accountType,
    });

    let reassignedEmployees = [];
    if (before.name !== account.name) {
      reassignedEmployees = await EmployeeModel.updateAccountAssignment(before.name, account.name);
    }

    await AuditLogModel.create({
      ...auditActor(user),
      action: 'account.update',
      entityType: 'accounts',
      entityId: account.id,
      details: {
        from: before.name,
        to: account.name,
        accountType: account.accountType,
        reassignedEmployees: reassignedEmployees.length,
      },
      ipAddress: meta.ipAddress,
    });

    return account;
  },

  async remove(id, user, meta = {}) {
    const account = await AccountModel.findById(id);
    if (!account) throw new AppError('Account not found', 404);

    const removed = await AccountModel.remove(id);
    if (!removed) throw new AppError('Account not found', 404);

    await AuditLogModel.create({
      ...auditActor(user),
      action: 'account.delete',
      entityType: 'accounts',
      entityId: id,
      details: { name: account.name, accountType: account.accountType },
      ipAddress: meta.ipAddress,
    });
  },

  touch(id) {
    return AccountModel.touch(id);
  },
};
