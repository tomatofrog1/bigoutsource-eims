export type UserRole = 'super_admin' | 'admin' | 'hr_admin' | 'it_admin' | 'viewer';
export type EmployeeStatus = 'active' | 'inactive';

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
  remoteId: string;
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
}

export interface AuditLog {
  id: string;
  timestamp: string;
  uid: string;
  userName: string;
  action: string;
  details: string;
  affectedRecord: string;
}

export const MOCK_EMPLOYEES: Employee[] = [];
