function cleanNamePart(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .replace(/['-]/g, '')
    .replace(/\s+/g, '');
}

export function generateLmsAccount(fullName = '') {
  const name = String(fullName || '').trim();
  if (!name) return '';

  if (name.includes(',')) {
    const [lastNamePart, firstNamePart] = name.split(',');
    const firstName = cleanNamePart(firstNamePart?.trim().split(/\s+/)[0]);
    const lastName = cleanNamePart(lastNamePart);

    if (firstName && lastName) return `${firstName}.${lastName}`;
    return firstName || lastName || '';
  }

  const parts = name
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/['-]/g, ''));

  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];

  return `${parts[0]}.${parts[parts.length - 1]}`;
}
