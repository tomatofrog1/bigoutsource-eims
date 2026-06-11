/**
 * Capability catalog + the default role → capability mapping.
 *
 * Capabilities are the real currency of access control. Routes and field
 * visibility check capabilities, never role names. The role → capability map
 * below is the in-code default for the five seeded roles; in Phase 3 this map
 * moves into the database (the `roles` table) so Super Admin can edit it, but
 * the catalog and the checks stay here.
 */

// key → human label (label used later by the role editor UI)
export const CAPABILITIES = {
  'employees.view': 'View employee directory (identity/HR fields)',
  'employees.create': 'Create employees',
  'employees.edit': 'Edit employee identity/HR fields',
  'employees.delete': 'Archive Employees',
  'employees.it.view': 'View employee IT fields',
  'employees.it.edit': 'Edit employee IT fields',
  'employees.secrets.view': 'View employee secrets (passwords, keys, remote IDs)',
  'employees.secrets.edit': 'Edit employee secrets',
  'assets.view': 'View IT assets',
  'assets.edit': 'Manage IT assets',
  'departments.view': 'View departments',
  'departments.edit': 'Manage departments',
  'sites.view': 'View sites',
  'sites.edit': 'Manage sites',
  'imports.manage': 'Run employee imports',
  'reports.view': 'View reports',
  'reports.export': 'Export / download reports',
  'auditlogs.view': 'View audit logs',
  'auditlogs.undo': 'Undo audit-logged actions',
  'notifications.employee_added': 'Receive employee-added notifications',
  // Meta — Super Admin only; never grantable to custom roles (Phase 4 guardrail).
  'users.manage': 'Manage user accounts',
  'roles.manage': 'Manage roles & permissions',
  'settings.manage': 'Manage system settings',
};

export const ALL_CAPABILITIES = Object.keys(CAPABILITIES);

export const META_CAPABILITIES = ['users.manage', 'roles.manage', 'settings.manage'];

// Default capability sets for the five seeded roles (the agreed access matrix).
export const ROLE_CAPABILITIES = {
  super_admin: ALL_CAPABILITIES,
  admin: [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'employees.it.view', 'employees.it.edit', 'employees.secrets.view', 'employees.secrets.edit',
    'assets.view', 'assets.edit',
    'departments.view', 'departments.edit',
    'sites.view', 'sites.edit',
    'imports.manage',
    'reports.view', 'reports.export',
    'auditlogs.view', 'auditlogs.undo',
    'notifications.employee_added',
  ],
  hr_admin: [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'departments.view', 'departments.edit',
    'sites.view',
    'imports.manage',
    'reports.view', 'reports.export',
    'auditlogs.view',
    'notifications.employee_added',
  ],
  it_admin: [
    'employees.view',
    'employees.it.view', 'employees.it.edit', 'employees.secrets.view', 'employees.secrets.edit',
    'assets.view', 'assets.edit',
    'departments.view',
    'sites.view',
    'imports.manage',
    'reports.view', 'reports.export',
    'auditlogs.view',
    'notifications.employee_added',
  ],
  viewer: [
    'employees.view',
    'departments.view',
    'sites.view',
    'notifications.employee_added',
  ],
};

export function capabilitiesForRole(role) {
  return ROLE_CAPABILITIES[role] ? [...ROLE_CAPABILITIES[role]] : [];
}

/** Resolve a user's effective capabilities (prefers an explicit list, else derives from role). */
export function userCapabilities(user) {
  if (!user) return [];
  if (Array.isArray(user.capabilities)) return user.capabilities;
  return capabilitiesForRole(user.role);
}

export function userHasCapability(user, capability) {
  return userCapabilities(user).includes(capability);
}

export function userHasAnyCapability(user, capabilities = []) {
  const owned = userCapabilities(user);
  return capabilities.some((capability) => owned.includes(capability));
}
