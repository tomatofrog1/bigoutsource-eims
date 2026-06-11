import { randomUUID } from 'node:crypto';
import { EmployeeImportModel } from '../models/employeeImport.model.js';
import { EmployeeModel } from '../models/employee.model.js';
import { AccountModel } from '../models/account.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { AppError } from '../utils/apiResponse.js';
import { generateLmsAccount } from '../utils/lmsAccount.js';

const sourceSheet = 'IT Master Tracker';
const mappedFields = [
  'employeeNumber',
  'fullName',
  'accountAssignment',
  'phone',
  'address',
  'boEmail',
  'emailPassword',
  'lmsAccount',
  'status',
  'siteName',
  'pcName',
  'rustdeskId',
  'esetStatus',
  'biosDate',
  'activityWatchStatus',
  'windowsKey',
  'is_archived',
];

function value(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function normalizeStatus(status) {
  const next = String(status || '').trim().toLowerCase();
  if (next === 'deactivated') return { status: 'inactive', isArchived: true };
  if (next === 'inactive') return { status: 'inactive', isArchived: false };
  return { status: 'active', isArchived: false };
}

function normalizeEset(status) {
  const next = String(status || '').trim().toLowerCase();
  return next === 'installed' || next === 'active' ? 'active' : 'inactive';
}

function normalizeActivityWatch(status) {
  const next = String(status || '').trim().toLowerCase();
  return next === 'installed' || next === 'active' ? 'installed' : 'missing';
}

function normalizeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeSite(value) {
  const next = String(value || '').trim().toLowerCase();
  if (next === 'can' || next === 'cand' || next === 'candelaria') return 'Candelaria';
  if (next === 'wfh/hybrid' || next === 'hybrid') return 'Hybrid';
  if (next === 'wfh') return 'WFH';
  if (next === 'hq' || next === 'san pablo' || next === 'san pablo city' || next === 'san pablo (hq)' || next === 'san pablo city (hq)') return 'HQ';
  return value || '';
}

function normalizeRow(row) {
  const status = normalizeStatus(value(row, 'Status'));
  const fullName = value(row, 'Name');

  return {
    employeeNumber: value(row, 'ID'),
    fullName,
    accountAssignment: value(row, 'Account'),
    phone: value(row, 'Phone Number'),
    address: value(row, 'Address'),
    boEmail: value(row, 'Bigoutsource Email'),
    emailPassword: value(row, 'Email Password'),
    lmsAccount: value(row, 'LMS Account') || generateLmsAccount(fullName),
    status: status.status,
    siteName: normalizeSite(value(row, 'Site')),
    pcName: value(row, 'PC Name'),
    rustdeskId: value(row, 'RustDesk ID'),
    esetStatus: normalizeEset(value(row, 'ESET')),
    biosDate: normalizeDate(value(row, 'BIOS Date')),
    activityWatchStatus: normalizeActivityWatch(value(row, 'ActivityWatch')),
    windowsKey: value(row, 'Windows License Key'),
    is_archived: status.isArchived,
  };
}

function completeness(record) {
  return mappedFields.reduce((count, field) => {
    const value = record[field];
    if (typeof value === 'boolean') return count + 1;
    return value ? count + 1 : count;
  }, 0);
}

function validateRecord(record, duplicateKeys, existingIds = new Set()) {
  const issues = [];

  if (!record.employeeNumber) issues.push({ code: 'missing_id', message: 'Missing employee ID' });
  if (!record.fullName) issues.push({ code: 'missing_name', message: 'Missing employee name' });
  if (!record.boEmail) issues.push({ code: 'missing_email', message: 'Missing Bigoutsource email' });
  if (!record.accountAssignment) issues.push({ code: 'missing_account', message: 'Missing account' });
  
  const validSites = ['HQ', 'Candelaria', 'WFH', 'Hybrid'];
  if (!record.siteName) {
    issues.push({ code: 'missing_site', message: 'Missing site' });
  } else if (!validSites.includes(record.siteName)) {
    issues.push({ code: 'invalid_site', message: 'Site is not recognized' });
  }

  if (record.employeeNumber && duplicateKeys.has(record.employeeNumber)) {
    issues.push({ code: 'duplicate_id', message: `Duplicate employee ID ${record.employeeNumber}` });
  }
  if (record.employeeNumber && existingIds.has(record.employeeNumber)) {
    issues.push({ code: 'existing_id', message: `Employee ID ${record.employeeNumber} already exists in Employee Records` });
  }

  if (record.biosDate) {
    const date = new Date(record.biosDate);
    if (Number.isNaN(date.getTime())) {
      issues.push({ code: 'invalid_bios_date', message: `Invalid BIOS date format: "${record.biosDate}"` });
    }
  }

  return issues;
}

function coerceEditableData(data = {}) {
  const status = normalizeStatus(data.status);
  const fullName = String(data.fullName || '').trim();

  return {
    employeeNumber: String(data.employeeNumber || '').trim(),
    fullName,
    accountAssignment: String(data.accountAssignment || '').trim(),
    phone: String(data.phone || '').trim(),
    address: String(data.address || '').trim(),
    boEmail: String(data.boEmail || '').trim(),
    emailPassword: String(data.emailPassword || '').trim(),
    lmsAccount: String(data.lmsAccount || '').trim() || generateLmsAccount(fullName),
    status: status.status,
    siteName: normalizeSite(data.siteName),
    pcName: String(data.pcName || '').trim(),
    rustdeskId: String(data.rustdeskId || '').trim(),
    esetStatus: normalizeEset(data.esetStatus),
    biosDate: normalizeDate(data.biosDate),
    activityWatchStatus: normalizeActivityWatch(data.activityWatchStatus),
    windowsKey: String(data.windowsKey || '').trim(),
    is_archived: data.is_archived ?? status.isArchived,
  };
}

function summarize(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.total += 1;
      summary[row.status] = (summary[row.status] || 0) + 1;
      return summary;
    },
    { total: 0, ready: 0, issue: 0, imported: 0, skipped: 0 }
  );
}

function mergeRecords(records) {
  const sorted = [...records].sort((a, b) => completeness(b.normalizedData) - completeness(a.normalizedData));
  const merged = { ...sorted[0].normalizedData };

  for (const row of sorted.slice(1)) {
    for (const field of mappedFields) {
      if ((merged[field] === undefined || merged[field] === null || merged[field] === '') && row.normalizedData[field]) {
        merged[field] = row.normalizedData[field];
      }
    }
  }

  return merged;
}

async function loadExistingEmployeeIds() {
  const employees = await EmployeeModel.findAll();
  return new Set(
    employees
      .map((employee) => String(employee.employeeNumber ?? employee.id ?? '').trim())
      .filter(Boolean)
  );
}

/**
 * Create departments (accounts) that an import references but that don't exist yet.
 * Runs as part of the import flow, so it is authorized by `imports.manage` rather
 * than `departments.edit` — this lets importers (e.g. IT Admin) resolve unknown
 * departments inline. De-duplicated by name and skips any that already exist.
 */
async function createMissingDepartments(newDepartments = []) {
  if (!Array.isArray(newDepartments) || !newDepartments.length) return [];

  const created = [];
  const seen = new Set();

  for (const dept of newDepartments) {
    const name = String(dept?.name || '').trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const existing = await AccountModel.findByName(name);
    if (existing?.id) continue;

    const account = await AccountModel.create({
      name,
      accountType: dept.type ?? dept.accountType,
      departmentCode: dept.code ?? dept.departmentCode,
    });
    created.push(account);
  }

  return created;
}

export const EmployeeImportService = {
  async stage({ rows }, user) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('No rows were provided for import', 400);
    }

    const importBatchId = randomUUID();
    const normalizedRows = rows.map((row) => ({
      sourceRow: row.sourceRow,
      rawData: row.rawData || {},
      normalizedData: normalizeRow(row.rawData || {}),
    }));
    const idCounts = new Map();

    normalizedRows.forEach((row) => {
      const id = row.normalizedData.employeeNumber;
      if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });

    const duplicateKeys = new Set([...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
    const existingIds = await loadExistingEmployeeIds();
    const stagedRows = normalizedRows.map((row) => {
      const issues = validateRecord(row.normalizedData, duplicateKeys, existingIds);
      return {
        importBatchId,
        sourceSheet,
        sourceRow: row.sourceRow,
        rawData: row.rawData,
        normalizedData: row.normalizedData,
        issues,
        status: issues.length ? 'issue' : 'ready',
        duplicateKey: duplicateKeys.has(row.normalizedData.employeeNumber) ? row.normalizedData.employeeNumber : null,
        createdBy: user?.id,
      };
    });

    const created = await EmployeeImportModel.insertMany(stagedRows);
    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.stage',
      entityType: 'employee_import_staging',
      entityId: importBatchId,
      details: summarize(created),
    });

    return { importBatchId, rows: created, summary: summarize(created) };
  },

  async list(filters = {}) {
    const rows = await EmployeeImportModel.findAll(filters);
    return { rows, summary: summarize(rows) };
  },

  async summary() {
    return { pendingImports: await EmployeeImportModel.countPendingImports() };
  },

  async resolveDuplicate({ importBatchId, duplicateKey, action, keepRowId, normalizedData: overrideNormalizedData, mergedData }, user) {
    if (!importBatchId || !duplicateKey || !action) {
      throw new AppError('importBatchId, duplicateKey, and action are required', 400);
    }

    const rows = (await EmployeeImportModel.findAll({ importBatchId })).filter((row) => row.duplicateKey === duplicateKey);
    if (rows.length < 2) throw new AppError('Duplicate group not found', 404);

    let selectedRow = rows.find((row) => row.id === keepRowId) || rows[0];
    let normalizedData = selectedRow.normalizedData;

    if (action === 'merge') {
      normalizedData = mergeRecords(rows);
      const overrideData = mergedData || overrideNormalizedData;
      if (overrideData && typeof overrideData === 'object') {
        normalizedData = { ...normalizedData, ...overrideData };
      }
      normalizedData = coerceEditableData(normalizedData);
      selectedRow = rows.sort((a, b) => completeness(b.normalizedData) - completeness(a.normalizedData))[0];
    } else if (action !== 'keep') {
      throw new AppError('Unsupported duplicate resolution action', 400);
    }

    const existingIds = await loadExistingEmployeeIds();
    const remainingIssues = validateRecord(normalizedData, new Set(), existingIds).filter((issue) => issue.code !== 'duplicate_id');
    const updated = [];

    for (const row of rows) {
      if (row.id === selectedRow.id) {
        updated.push(await EmployeeImportModel.update(row.id, {
          ...row,
          normalizedData,
          issues: remainingIssues,
          status: remainingIssues.length ? 'issue' : 'ready',
          duplicateKey: null,
          resolution: { action, resolvedBy: user?.id, resolvedAt: new Date().toISOString() },
        }));
      } else {
        updated.push(await EmployeeImportModel.update(row.id, {
          ...row,
          status: 'skipped',
          resolution: { action, keptRowId: selectedRow.id, resolvedBy: user?.id, resolvedAt: new Date().toISOString() },
        }));
      }
    }

    return { rows: updated };
  },

  async updateRow(id, data, user) {
    const row = await EmployeeImportModel.findById(id);
    if (!row) throw new AppError('Import row not found', 404);
    if (row.status === 'imported') throw new AppError('Imported rows cannot be edited', 400);

    const batchRows = await EmployeeImportModel.findAll({ importBatchId: row.importBatchId });
    const duplicateKeys = new Set();
    const candidate = coerceEditableData({ ...row.normalizedData, ...data });

    if (candidate.employeeNumber) {
      const matchingRows = batchRows.filter((item) => (
        item.id !== id &&
        item.status !== 'skipped' &&
        item.status !== 'imported' &&
        item.normalizedData?.employeeNumber === candidate.employeeNumber
      ));

      if (matchingRows.length) duplicateKeys.add(candidate.employeeNumber);
    }

    const existingIds = await loadExistingEmployeeIds();
    const issues = validateRecord(candidate, duplicateKeys, existingIds);
    const updated = await EmployeeImportModel.update(id, {
      ...row,
      normalizedData: candidate,
      issues,
      status: issues.length ? 'issue' : 'ready',
      duplicateKey: duplicateKeys.has(candidate.employeeNumber) ? candidate.employeeNumber : null,
      resolution: {
        ...(row.resolution || {}),
        action: 'edited',
        editedBy: user?.id,
        editedAt: new Date().toISOString(),
      },
    });

    const oldEmpNumber = row.normalizedData?.employeeNumber;
    if (oldEmpNumber && oldEmpNumber !== candidate.employeeNumber) {
      const oldMatchingRows = batchRows.filter((item) => (
        item.id !== id &&
        item.status !== 'skipped' &&
        item.status !== 'imported' &&
        item.normalizedData?.employeeNumber === oldEmpNumber
      ));

      if (oldMatchingRows.length === 1) {
        const remainingRow = oldMatchingRows[0];
        const newIssues = validateRecord(remainingRow.normalizedData, new Set(), existingIds);
        await EmployeeImportModel.update(remainingRow.id, {
          ...remainingRow,
          issues: newIssues,
          status: newIssues.length ? 'issue' : 'ready',
          duplicateKey: null,
        });
      }
    }

    if (candidate.employeeNumber && duplicateKeys.has(candidate.employeeNumber)) {
      const newMatchingRows = batchRows.filter((item) => (
        item.id !== id &&
        item.status !== 'skipped' &&
        item.status !== 'imported' &&
        item.normalizedData?.employeeNumber === candidate.employeeNumber
      ));
      
      for (const match of newMatchingRows) {
        if (match.duplicateKey !== candidate.employeeNumber) {
          const matchIssues = validateRecord(match.normalizedData, duplicateKeys, existingIds);
          await EmployeeImportModel.update(match.id, {
            ...match,
            issues: matchIssues,
            status: matchIssues.length ? 'issue' : 'ready',
            duplicateKey: candidate.employeeNumber,
          });
        }
      }
    }

    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.edit_row',
      entityType: 'employee_import_staging',
      entityId: id,
      details: {
        importBatchId: row.importBatchId,
        sourceRow: row.sourceRow,
        status: updated.status,
        issues: updated.issues,
      },
    });

    return updated;
  },

  async deleteRows({ ids = [] }, user) {
    if (!Array.isArray(ids) || !ids.length) {
      throw new AppError('At least one import row id is required', 400);
    }

    const deleted = await EmployeeImportModel.removeByIds(ids);
    const employeeIds = deleted.map((row) => row.normalizedData?.employeeNumber).filter(Boolean);

    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.delete_rows',
      entityType: 'employee_import_staging',
      details: {
        requested: ids.length,
        deleted: deleted.length,
        employeeIds: employeeIds.length ? employeeIds : undefined,
        rowIds: deleted.map((row) => row.id),
      },
    });

    return { deleted: deleted.length, rows: deleted };
  },

  async deleteRow(id, user) {
    const row = await EmployeeImportModel.findById(id);
    if (!row) throw new AppError('Import row not found', 404);
    if (row.status === 'imported') throw new AppError('Imported rows cannot be deleted from import review', 400);

    await EmployeeImportModel.remove(id);
    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.delete_row',
      entityType: 'employee_import_staging',
      entityId: id,
      details: {
        importBatchId: row.importBatchId,
        sourceRow: row.sourceRow,
        status: row.status,
        duplicateKey: row.duplicateKey,
        employeeId: row.normalizedData?.employeeNumber || undefined,
      },
    });

    return { deleted: 1, importBatchId: row.importBatchId };
  },

  async deleteMany({ importBatchId, type }, user) {
    if (!importBatchId) throw new AppError('importBatchId is required', 400);
    if (!['issues', 'duplicates'].includes(type)) throw new AppError('type must be issues or duplicates', 400);

    const rows = await EmployeeImportModel.findAll({ importBatchId, status: 'issue' });
    const targets = rows.filter((row) => (
      type === 'duplicates' ? Boolean(row.duplicateKey) : !row.duplicateKey
    ));

    for (const row of targets) {
      await EmployeeImportModel.remove(row.id);
    }

    const employeeIds = targets.map((row) => row.normalizedData?.employeeNumber).filter(Boolean);

    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.delete_many',
      entityType: 'employee_import_staging',
      entityId: importBatchId,
      details: {
        type,
        deleted: targets.length,
        employeeIds: employeeIds.length ? employeeIds : undefined,
      },
    });

    return { deleted: targets.length, importBatchId };
  },

  async importReady(importBatchId, user, meta = {}, newDepartments = []) {
    const createdDepartments = await createMissingDepartments(newDepartments);

    const readyRows = (await EmployeeImportModel.findAll({ importBatchId, status: 'ready' })).sort((a, b) => a.sourceRow - b.sourceRow);
    const results = { imported: 0, failed: 0, failures: [], departmentsCreated: createdDepartments.length };

    for (const row of readyRows) {
      try {
        await EmployeeModel.create(row.normalizedData);
        await EmployeeImportModel.remove(row.id);
        results.imported += 1;
      } catch (error) {
        await EmployeeImportModel.update(row.id, {
          ...row,
          status: 'issue',
          issues: [...row.issues, { code: 'database_error', message: error.message || 'Unable to import row' }],
        });
        results.failed += 1;
        results.failures.push({ id: row.id, sourceRow: row.sourceRow, message: error.message });
      }
    }

    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.import_ready',
      entityType: 'employee_import_staging',
      entityId: importBatchId,
      details: results,
      ipAddress: meta.ipAddress,
    });

    return results;
  },
};
