import type { AppUser } from '@/src/types';

/**
 * Capability keys — must mirror the backend catalog in
 * server/src/config/capabilities.js. The server is the source of truth; the
 * client receives the user's effective capabilities in the login/me payload
 * and only checks membership here (UX gating, never the security boundary).
 */
export type Capability =
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.it.view'
  | 'employees.it.edit'
  | 'employees.secrets.view'
  | 'employees.secrets.edit'
  | 'assets.view'
  | 'assets.edit'
  | 'departments.view'
  | 'departments.edit'
  | 'sites.view'
  | 'sites.edit'
  | 'imports.manage'
  | 'reports.view'
  | 'reports.export'
  | 'auditlogs.view'
  | 'auditlogs.undo'
  | 'notifications.employee_added'
  | 'users.manage'
  | 'roles.manage'
  | 'settings.manage';

export function userCan(user: AppUser | null | undefined, capability: Capability): boolean {
  return Boolean(user?.capabilities?.includes(capability));
}
