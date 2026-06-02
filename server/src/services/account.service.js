import { AccountModel } from '../models/account.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { EmployeeModel } from '../models/employee.model.js';
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

    const existingName = await AccountModel.findByName(name);
    if (existingName && existingName.id !== id) {
      throw new AppError('Department name already exists. Enter a unique name.', 409);
    }

    const hasDepartmentCodeInput = data.departmentCode !== undefined || data.department_code !== undefined;
    const departmentCode = hasDepartmentCodeInput
      ? sanitizeDepartmentCode(data.departmentCode ?? data.department_code)
      : before.departmentCode;

    if (!departmentCode) throw new AppError('departmentCode is required', 400);

    const existingCode = await AccountModel.findByDepartmentCode(departmentCode);
    if (existingCode && existingCode.id !== id) {
      throw new AppError('Department code already exists. Enter a unique letters-only code.', 409);
    }

    const account = await AccountModel.update(id, { name, departmentCode });
    if (!account) throw new AppError('Account not found', 404);

    if (before.name !== account.name) {
      const employees = await EmployeeModel.findAll();
      const assignedEmployees = employees.filter((employee) => employee.accountAssignment === before.name);
      await Promise.all(assignedEmployees.map((employee) => EmployeeModel.update(employee.id, { accountAssignment: account.name })));
    }

    await AuditLogModel.create({
      ...auditActor(user),
      action: 'account.update',
      entityType: 'accounts',
      entityId: account.id,
      details: {
        from: { name: before.name, departmentCode: before.departmentCode },
        to: { name: account.name, departmentCode: account.departmentCode },
      },
      ipAddress: meta.ipAddress,
    });

    return account;
  },

  async remove(id, user, meta = {}) {
    const account = await AccountModel.findById(id);
    if (!account) throw new AppError('Account not found', 404);

    const employees = await EmployeeModel.findAll();
    const assignedEmployees = employees.filter((employee) => employee.accountAssignment === account.name);
    if (assignedEmployees.length > 0) {
      throw new AppError('Move or delete employees assigned to this department before deleting it.', 400);
    }

    const removed = await AccountModel.remove(id);
    if (!removed) throw new AppError('Account not found', 404);

    await AuditLogModel.create({
      ...auditActor(user),
      action: 'account.delete',
      entityType: 'accounts',
      entityId: id,
      details: { name: account.name, accountType: account.accountType, departmentCode: account.departmentCode },
      ipAddress: meta.ipAddress,
    });
  },

  touch(id) {
    return AccountModel.touch(id);
  },
};
