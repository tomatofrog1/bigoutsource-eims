import { EmployeeModel } from '../models/employee.model.js';
import { AccountModel } from '../models/account.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { AppError } from '../utils/apiResponse.js';
import { auditActor } from '../utils/auditActor.js';
import { filterEmployeeWritePayload } from '../utils/employeeSecurity.js';
import { NotificationService } from '../services/notification.service.js';
import {
  buildCompanyEmail,
  buildEmployeeIdentifierBase,
  buildLmsUsernameBase,
  buildPcName,
  parseEmployeeName,
  sanitizeDepartmentCode,
  withNumericSuffix,
} from '../utils/employeeIdentity.js';

const trackedFields = [
  'employeeNumber',
  'fullName',
  'boEmail',
  'emailPassword',
  'phone',
  'address',
  'accountAssignment',
  'lmsAccount',
  'site',
  'status',
  'pcName',
  'biosDate',
  'windowsKey',
  'rustdeskId',
  'esetStatus',
  'activityWatchStatus',
  'isArchived',
];

function localEmailIdentifier(email = '') {
  return String(email).split('@')[0]?.split('.')[0] || '';
}

function pcIdentifier(pcName = '') {
  const parts = String(pcName).split('-');
  return parts.length > 1 ? parts.slice(1).join('-') : '';
}

function generatedFieldsChanged(data = {}) {
  return [
    'firstName',
    'first_name',
    'middleName',
    'middle_name',
    'lastName',
    'last_name',
    'fullName',
    'name',
    'accountAssignment',
    'account',
    'internalDepartmentId',
    'internal_department_id',
    'externalDepartmentId',
    'external_department_id',
  ].some((field) => data[field] !== undefined);
}

async function resolveAccount(data, existing) {
  const accountName = data.accountAssignment || data.account || existing?.accountAssignment || existing?.account;
  if (!accountName) throw new AppError('accountAssignment is required', 400);

  const account = await AccountModel.findByName(accountName);
  if (!account) throw new AppError(`Department/account "${accountName}" was not found`, 400);

  const departmentCode = sanitizeDepartmentCode(account.departmentCode || account.department_code);
  if (!departmentCode) {
    throw new AppError(`Department/account "${account.name}" needs a department code before employees can be saved`, 400);
  }

  return {
    name: account.name,
    type: account.accountType,
    code: departmentCode,
  };
}

function collectUsedValues(employees, currentId) {
  return employees.reduce(
    (sets, employee) => {
      if (String(employee.id) === String(currentId)) return sets;
      if (employee.lmsAccount) sets.lmsUsernames.add(employee.lmsAccount);

      const emailIdentifier = localEmailIdentifier(employee.boEmail);
      const pcNameIdentifier = pcIdentifier(employee.pcName);
      if (emailIdentifier) sets.employeeIdentifiers.add(emailIdentifier);
      if (pcNameIdentifier) sets.employeeIdentifiers.add(pcNameIdentifier);
      return sets;
    },
    {
      lmsUsernames: new Set(),
      employeeIdentifiers: new Set(),
    }
  );
}

async function withGeneratedIdentity(data, existing = null) {
  const merged = { ...(existing || {}), ...(data || {}) };
  const name = parseEmployeeName(merged);
  const account = await resolveAccount(merged, existing);
  const baseLmsAccount = buildLmsUsernameBase(name);
  const baseIdentifier = buildEmployeeIdentifierBase(name);
  const similarEmployees = await EmployeeModel.findSimilarIdentities(baseIdentifier, baseLmsAccount);
  const used = collectUsedValues(similarEmployees, existing?.id);
  const defaultLmsAccount = withNumericSuffix(baseLmsAccount, used.lmsUsernames);
  const identifier = withNumericSuffix(baseIdentifier, used.employeeIdentifiers);

  if (!name.fullName || !name.lastName) throw new AppError('first name and last name are required', 400);
  if (!defaultLmsAccount || !identifier) throw new AppError('Unable to generate employee identity from the provided name', 400);

  const lmsAccount = data.lmsAccount !== undefined && data.lmsAccount !== ''
    ? data.lmsAccount
    : (existing ? existing.lmsAccount : defaultLmsAccount);

  const boEmail = data.boEmail !== undefined && data.boEmail !== ''
    ? data.boEmail
    : (existing ? existing.boEmail : buildCompanyEmail(identifier, account.code, account.type));

  const pcName = data.pcName !== undefined && data.pcName !== ''
    ? data.pcName
    : (existing ? existing.pcName : buildPcName(identifier, account.code));

  return {
    ...data,
    fullName: name.fullName,
    accountAssignment: account.name,
    lmsAccount,
    boEmail,
    pcName,
  };
}

function comparable(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function diffEmployee(before, after) {
  return trackedFields
    .map((field) => ({
      field,
      from: comparable(before?.[field]),
      to: comparable(after?.[field]),
    }))
    .filter((change) => change.from !== change.to);
}

export const EmployeeService = {
  list() {
    return EmployeeModel.findAll();
  },

  async summary() {
    const inactiveUnarchived = await EmployeeModel.countInactiveUnarchived();
    return { inactiveUnarchived };
  },

  async get(id) {
    const employee = await EmployeeModel.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  },

  async create(data, user, meta = {}) {
    const actor = auditActor(user);
    data = filterEmployeeWritePayload(data, user, true);

    if (!data.employeeNumber && !data.employeeId && !data.id) {
      throw new AppError('id is required', 400);
    }

    if (!data.siteId && !data.siteName && !data.site) {
      throw new AppError('site is required', 400);
    }

    const employee = await EmployeeModel.create(await withGeneratedIdentity(data));
    await AuditLogModel.create({
      ...actor,
      action: 'employee.create',
      entityType: 'employees',
      entityId: employee.id,
      entityLabel: employee.fullName || employee.employeeNumber || employee.id,
      details: {
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        accountAssignment: employee.accountAssignment,
        site: employee.site,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await NotificationService.notifyEmployeeAdded({ employee, actor }).catch((error) => {
      console.error('Unable to create employee-added notifications', error);
    });
    return employee;
  },

  async update(id, data, user, meta = {}) {
    const actor = auditActor(user);
    const submittedFieldCount = data && typeof data === 'object' ? Object.keys(data).length : 0;
    data = filterEmployeeWritePayload(data, user);
    if (!Object.keys(data || {}).length) {
      throw new AppError(
        submittedFieldCount
          ? 'You do not have permission to edit the submitted employee fields'
          : 'No employee fields supplied',
        submittedFieldCount ? 403 : 400
      );
    }
    const before = await EmployeeModel.findById(id);
    if (!before) throw new AppError('Employee not found', 404);

    const archiveValue = data?.is_archived ?? data?.isArchived;
    const willBeArchived = archiveValue === undefined ? before.isArchived : archiveValue === true || String(archiveValue).toLowerCase() === 'true';

    const employee = await EmployeeModel.update(id, generatedFieldsChanged(data) ? await withGeneratedIdentity(data, before) : data);
    if (!employee) throw new AppError('Employee not found', 404);

    const changes = diffEmployee(before, employee);
    await AuditLogModel.create({
      ...actor,
      action: 'employee.update',
      entityType: 'employees',
      entityId: id,
      entityLabel: employee.fullName || employee.employeeNumber || id,
      details: {
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        changes,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return employee;
  },

  async remove(id, user, meta = {}) {
    const actor = auditActor(user);
    const removed = await EmployeeModel.remove(id);
    if (!removed) throw new AppError('Employee not found', 404);
    await AuditLogModel.create({
      ...actor,
      action: 'employee.delete',
      entityType: 'employees',
      entityId: id,
      entityLabel: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },
};
