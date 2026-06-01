import { randomUUID } from 'node:crypto';
import { EmployeeImportModel } from '../models/employeeImport.model.js';
import { EmployeeModel } from '../models/employee.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { AppError } from '../utils/apiResponse.js';

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
  'remoteId',
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
  if (next === 'inactive') return { status: 'inactive', isArchived: true };
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

function normalizeRow(row) {
  const status = normalizeStatus(value(row, 'Status'));

  return {
    employeeNumber: value(row, 'ID'),
    fullName: value(row, 'Name'),
    accountAssignment: value(row, 'Account'),
    phone: value(row, 'Phone Number'),
    address: value(row, 'Address'),
    boEmail: value(row, 'Bigoutsource Email'),
    emailPassword: value(row, 'Email Password'),
    lmsAccount: value(row, 'LMS Account'),
    status: status.status,
    siteName: value(row, 'Site'),
    pcName: value(row, 'PC Name'),
    rustdeskId: value(row, 'RustDesk ID'),
    remoteId: value(row, 'Remote ID'),
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

function validateRecord(record, duplicateKeys) {
  const issues = [];

  if (!record.employeeNumber) issues.push({ code: 'missing_id', message: 'Missing employee ID' });
  if (!record.fullName) issues.push({ code: 'missing_name', message: 'Missing employee name' });
  if (!record.boEmail) issues.push({ code: 'missing_email', message: 'Missing Bigoutsource email' });
  if (!record.accountAssignment) issues.push({ code: 'missing_account', message: 'Missing account' });
  if (!record.siteName) issues.push({ code: 'missing_site', message: 'Missing site' });
  if (record.employeeNumber && duplicateKeys.has(record.employeeNumber)) {
    issues.push({ code: 'duplicate_id', message: `Duplicate employee ID ${record.employeeNumber}` });
  }

  return issues;
}

function coerceEditableData(data = {}) {
  const status = normalizeStatus(data.status);

  return {
    employeeNumber: String(data.employeeNumber || '').trim(),
    fullName: String(data.fullName || '').trim(),
    accountAssignment: String(data.accountAssignment || '').trim(),
    phone: String(data.phone || '').trim(),
    address: String(data.address || '').trim(),
    boEmail: String(data.boEmail || '').trim(),
    emailPassword: String(data.emailPassword || '').trim(),
    lmsAccount: String(data.lmsAccount || '').trim(),
    status: status.status,
    siteName: String(data.siteName || '').trim(),
    pcName: String(data.pcName || '').trim(),
    rustdeskId: String(data.rustdeskId || '').trim(),
    remoteId: String(data.remoteId || '').trim(),
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
    const stagedRows = normalizedRows.map((row) => {
      const issues = validateRecord(row.normalizedData, duplicateKeys);
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
    return { unresolvedIssues: await EmployeeImportModel.countUnresolvedIssues() };
  },

  async resolveDuplicate({ importBatchId, duplicateKey, action, keepRowId, mergedData }, user) {
    if (!importBatchId || !duplicateKey || !action) {
      throw new AppError('importBatchId, duplicateKey, and action are required', 400);
    }

    const rows = (await EmployeeImportModel.findAll({ importBatchId })).filter((row) => row.duplicateKey === duplicateKey);
    if (rows.length < 2) throw new AppError('Duplicate group not found', 404);

    let selectedRow = rows.find((row) => row.id === keepRowId) || rows[0];
    let normalizedData = selectedRow.normalizedData;

    if (action === 'merge') {
      normalizedData = coerceEditableData(mergedData || mergeRecords(rows));
      selectedRow = rows.sort((a, b) => completeness(b.normalizedData) - completeness(a.normalizedData))[0];
    } else if (action !== 'keep') {
      throw new AppError('Unsupported duplicate resolution action', 400);
    }

    const remainingIssues = validateRecord(normalizedData, new Set()).filter((issue) => issue.code !== 'duplicate_id');
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

    const issues = validateRecord(candidate, duplicateKeys);
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

    await AuditLogModel.create({
      userId: user?.id,
      userEmail: user?.email,
      action: 'employee_import.delete_many',
      entityType: 'employee_import_staging',
      entityId: importBatchId,
      details: {
        type,
        deleted: targets.length,
      },
    });

    return { deleted: targets.length, importBatchId };
  },

  async importReady(importBatchId, user, meta = {}) {
    const readyRows = (await EmployeeImportModel.findAll({ importBatchId, status: 'ready' })).sort((a, b) => a.sourceRow - b.sourceRow);
    const results = { imported: 0, failed: 0, failures: [] };

    for (const row of readyRows) {
      try {
        await EmployeeModel.create(row.normalizedData);
        await EmployeeImportModel.update(row.id, {
          ...row,
          status: 'imported',
          resolution: { action: 'imported', importedBy: user?.id, importedAt: new Date().toISOString() },
        });
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
