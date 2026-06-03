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

const KNOWN_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'md', 'm.d.', 'phd', 'ph.d.', 'esq', 'esq.']);

export function parseEmployeeName(data = {}) {
  const firstNameRaw = String(data.firstName || data.first_name || '').trim();
  const middleNameRaw = String(data.middleName || data.middle_name || '').trim();
  const lastNameRaw = String(data.lastName || data.last_name || '').trim();
  const suffixRaw = String(data.suffix || '').trim();

  if (firstNameRaw || middleNameRaw || lastNameRaw) {
    return {
      firstName: firstNameRaw.replace(/\u00A0/g, ' '),
      middleName: middleNameRaw.replace(/\u00A0/g, ' '),
      lastName: lastNameRaw.replace(/\u00A0/g, ' '),
      suffix: suffixRaw,
      fullName: [firstNameRaw, middleNameRaw, lastNameRaw, suffixRaw].filter(Boolean).join(' ').trim(),
    };
  }

  const fullNameRaw = String(data.fullName || data.name || '').trim();
  
  if (fullNameRaw.includes(',')) {
    const [lastName, rest] = fullNameRaw.split(',').map(s => s.trim());
    const restParts = rest.split(/ +/).filter(Boolean);
    
    // Check if the rest is just a suffix
    if (restParts.length === 1 && KNOWN_SUFFIXES.has(restParts[0].toLowerCase())) {
      const suffix = restParts[0];
      const previousParts = lastName.split(/ +/).filter(Boolean);
      return {
        firstName: (previousParts[0] || '').replace(/\u00A0/g, ' '),
        middleName: previousParts.slice(1, -1).join(' ').replace(/\u00A0/g, ' '),
        lastName: (previousParts[previousParts.length - 1] || '').replace(/\u00A0/g, ' '),
        suffix: suffix,
        fullName: fullNameRaw
      };
    }

    if (restParts.length === 1) {
      return { 
        firstName: restParts[0].replace(/\u00A0/g, ' '), 
        middleName: '', 
        lastName: lastName.replace(/\u00A0/g, ' '),
        suffix: '',
        fullName: fullNameRaw
      };
    }
    
    let suffix = '';
    const possibleSuffix = restParts[restParts.length - 1];
    if (possibleSuffix && KNOWN_SUFFIXES.has(possibleSuffix.toLowerCase())) {
      suffix = restParts.pop();
    }

    return {
      firstName: restParts[0].replace(/\u00A0/g, ' '),
      middleName: restParts.slice(1).join(' ').replace(/\u00A0/g, ' '),
      lastName: lastName.replace(/\u00A0/g, ' '),
      suffix: suffix,
      fullName: fullNameRaw
    };
  }

  const parts = fullNameRaw.split(/ +/).filter(Boolean);

  let suffix = '';
  const lastPart = parts[parts.length - 1];
  if (lastPart && KNOWN_SUFFIXES.has(lastPart.toLowerCase())) {
    suffix = parts.pop();
  }

  if (parts.length <= 1) {
    return {
      firstName: (parts[0] || '').replace(/\u00A0/g, ' '),
      middleName: '',
      lastName: '',
      suffix,
      fullName: fullNameRaw,
    };
  }

  return {
    firstName: parts[0].replace(/\u00A0/g, ' '),
    middleName: parts.slice(1, -1).join(' ').replace(/\u00A0/g, ' '),
    lastName: parts[parts.length - 1].replace(/\u00A0/g, ' '),
    suffix,
    fullName: fullNameRaw,
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
  const givenNames = String(name.firstName || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
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
