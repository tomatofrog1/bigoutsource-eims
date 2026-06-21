import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { accountService } from '../services/accountService';
import { notificationService } from '../services/notificationService';
import { employeeService } from '../features/employees/services/employeeService';
import { deviceService } from '../features/assets/services/deviceService';
import { auditLogService } from '../features/reports/services/auditLogService';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export function useUsersQuery(params?: any) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.list(params).then(asArray),
  });
}

export function useAccountsQuery(params?: any) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => accountService.list(params).then(asArray),
  });
}

export function useEmployeesQuery(params?: any) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeeService.list(params).then(asArray),
  });
}

export function useDevicesQuery(params?: any) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => deviceService.list(params).then(asArray),
  });
}

export function useAuditLogsQuery(params?: any) {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: () => auditLogService.list(params).then(asArray),
  });
}

export function useNotificationsQuery(params?: any) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationService.list(params).then(asArray),
  });
}
