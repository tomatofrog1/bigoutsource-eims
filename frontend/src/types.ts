export type UserRole = 'super_admin' | 'admin' | 'hr_admin' | 'it_admin' | 'viewer';
type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  phone: string;
  address: string;
  site: string;
  status: EmployeeStatus;
  accountAssignment: string;
  boEmail: string;
  lmsAccount: string;
  // IT Data
  pcName: string;
  biosDate: string;
  windowsKey: string;
  rustDeskId: string;
  esetStatus: 'Active' | 'Inactive';
  activityWatchStatus: 'Installed' | 'Missing';
  updatedAt: string;
  updatedBy: string;
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'active' | 'disabled';
  fullName?: string;
  department?: string;
  site: string;
  /** Effective capabilities resolved server-side from the user's role. */
  capabilities?: string[];
  /** Per-account capability override; null/undefined means "inherit from role". */
  capabilityOverrides?: string[] | null;
  mfaEnabled?: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  uid: string;
  userName: string;
  action: string;
  details: string;
  affectedRecord: string;
}

export const MOCK_EMPLOYEES: Employee[] = [];
