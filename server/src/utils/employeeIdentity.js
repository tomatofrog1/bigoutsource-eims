function stripSpecial(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function sanitizeDepartmentCode(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export function suggestDepartmentCode(name = '') {
  const words = String(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return '';

  // Try initials (capped at 4)
  const initials = words
    .map((w) => w.replace(/[^a-zA-Z]/g, '').charAt(0).toLowerCase())
    .join('');

  if (initials.length >= 2) return initials.slice(0, 4);

  // Fallback: first 2-4 letters of first word
  const base = words[0].replace(/[^a-zA-Z]/g, '').toLowerCase();
  return base.slice(0, Math.max(2, Math.min(4, base.length)));
}

export function isValidDepartmentCode(code = '') {
  return /^[a-z]{2,3}$/.test(String(code));
}

export function parseEmployeeName(data = {}) {
  const firstName = String(data.firstName || data.first_name || '').trim();
  const middleName = String(data.middleName || data.middle_name || '').trim();
  const lastName = String(data.lastName || data.last_name || '').trim();

  if (firstName || middleName || lastName) {
    return {
      firstName,
      middleName,
      lastName,
      fullName: [firstName, middleName, lastName].filter(Boolean).join(' ').trim(),
    };
  }

  const fullName = String(data.fullName || data.name || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] || '',
      middleName: '',
      lastName: '',
      fullName,
    };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
    fullName,
  };
}

export function buildLmsUsernameBase(name) {
  const first = stripSpecial(name.firstName);
  const last = stripSpecial(name.lastName);
  if (!first && !last) return '';
  if (!last) return first;
  return `${first}.${last}`;
}

export function buildEmployeeIdentifierBase(name) {
  const givenNames = [name.firstName, name.middleName]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);
  const initials = givenNames.map((part) => stripSpecial(part).charAt(0)).join('');
  return `${initials}${stripSpecial(name.lastName)}`;
}

export function withNumericSuffix(base, usedValues) {
  if (!base) return '';
  if (!usedValues.has(base)) return base;

  let suffix = 2;
  while (usedValues.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export function buildCompanyEmail(identifier, departmentCode, accountType) {
  const domain = accountType === 'internal' || !['hc', 'utd'].includes(departmentCode)
    ? accountType === 'internal' ? 'com' : 'ph'
    : 'team';
  return `${identifier}.${departmentCode}@bigoutsource.${domain}`;
}

export function buildPcName(identifier, departmentCode) {
  return `${departmentCode}-${identifier}`;
}
