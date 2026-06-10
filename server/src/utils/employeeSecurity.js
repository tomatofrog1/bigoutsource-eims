/**
 * Field-level visibility & writability for employee records, driven by capabilities.
 *
 * An employee record mixes three tiers — identity/HR, IT operational, and
 * secrets — and different roles may see/edit different tiers of the same record.
 * Enforced on the server so values never leave the API, and so a user can't
 * write to a tier they don't own.
 */

import { userCapabilities } from '../config/capabilities.js';

// Read-shape keys (as produced by the model's normalize()).
const SECRET_READ_FIELDS = ['emailPassword', 'windowsKey', 'windowsLicenseKey', 'rustdeskId', 'rustDeskId'];
const IT_READ_FIELDS = ['pcName', 'biosDate', 'esetStatus', 'eset', 'activityWatchStatus', 'activitywatch'];

// Write-shape keys (as accepted from the client) grouped by tier.
const HR_WRITE_FIELDS = [
  'id', 'employeeId', 'employeeNumber',
  'name', 'fullName', 'firstName', 'middleName', 'lastName',
  'account', 'accountAssignment', 'internalDepartmentId', 'externalDepartmentId',
  'phone', 'phoneNumber', 'address',
  'boEmail', 'bigoutsourceEmail', 'lmsAccount',
  'status', 'site', 'siteId', 'siteName',
];
const IT_WRITE_FIELDS = ['pcName', 'biosDate', 'esetStatus', 'activityWatchStatus'];
const SECRET_WRITE_FIELDS = ['emailPassword', 'windowsKey', 'windowsLicenseKey', 'rustdeskId', 'rustDeskId'];
const ARCHIVE_WRITE_FIELDS = ['is_archived', 'isArchived'];

function blankFields(target, fields) {
  for (const field of fields) {
    if (field in target) target[field] = '';
  }
}

/** Returns a copy of the employee with tiers the user can't view blanked out. */
export function redactEmployeeForUser(employee, user) {
  if (!employee) return employee;
  const caps = userCapabilities(user);

  const needsRedaction =
    !caps.includes('employees.secrets.view') || !caps.includes('employees.it.view');
  if (!needsRedaction) return employee;

  const redacted = { ...employee };
  if (!caps.includes('employees.secrets.view')) blankFields(redacted, SECRET_READ_FIELDS);
  if (!caps.includes('employees.it.view')) blankFields(redacted, IT_READ_FIELDS);
  return redacted;
}

/**
 * Drops any incoming fields the user isn't allowed to write, so e.g. an IT Admin
 * can't change HR fields and an HR Admin can't change IT fields or secrets.
 */
export function filterEmployeeWritePayload(data, user, isCreate = false) {
  if (!data || typeof data !== 'object') return data;
  const caps = userCapabilities(user);

  const allowed = new Set();
  if (isCreate && caps.includes('employees.create')) {
    HR_WRITE_FIELDS.forEach((field) => allowed.add(field));
    IT_WRITE_FIELDS.forEach((field) => allowed.add(field));
    SECRET_WRITE_FIELDS.forEach((field) => allowed.add(field));
  } else {
    if (caps.includes('employees.edit')) {
      HR_WRITE_FIELDS.forEach((field) => allowed.add(field));
    }
    if (caps.includes('employees.it.edit')) IT_WRITE_FIELDS.forEach((field) => allowed.add(field));
    if (caps.includes('employees.secrets.edit')) SECRET_WRITE_FIELDS.forEach((field) => allowed.add(field));
    if (caps.includes('employees.delete')) ARCHIVE_WRITE_FIELDS.forEach((field) => allowed.add(field));
  }

  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) filtered[key] = value;
  }
  return filtered;
}
