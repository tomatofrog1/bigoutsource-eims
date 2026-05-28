/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import EmployeeProfile from './pages/EmployeeProfile';
import Departments from './pages/Departments';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Assets from './pages/Assets';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';
import EmployeeImportReview from './pages/EmployeeImportReview';
import { ImportIssuesButton } from './components/imports/ImportIssuesButton';
import { settingsService } from './services/settingsService';
import { userService } from './services/userService';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <SuperAdminRegistrationNotifier />
        <ImportIssuesButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/employee/:id" element={<EmployeeProfile />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/employee-imports/issues" element={<EmployeeImportReview />} />
            <Route path="/employee-imports/:batchId" element={<EmployeeImportReview />} />
            <Route element={<ProtectedRoute roles={['super_admin']} />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}

function SuperAdminRegistrationNotifier() {
  const { user } = useAuth();
  const lastPendingCount = useRef(0);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      toast.dismiss('pending-registration-alert');
      return;
    }

    let isMounted = true;

    async function checkPendingRegistrations() {
      try {
        const [settings, users] = await Promise.all([settingsService.get(), userService.list()]);
        if (!isMounted) return;

        if (!settings.notifyRegistrationAttempts) {
          toast.dismiss('pending-registration-alert');
          lastPendingCount.current = 0;
          return;
        }

        const pendingCount = Array.isArray(users) ? users.filter((account) => account.status === 'pending').length : 0;

        if (pendingCount === 0) {
          toast.dismiss('pending-registration-alert');
          lastPendingCount.current = 0;
          return;
        }

        if (pendingCount !== lastPendingCount.current) {
          lastPendingCount.current = pendingCount;
          toast.custom(
            (toastInstance) => (
              <div
                className={`w-80 rounded-2xl border border-amber-100 bg-white p-4 shadow-2xl transition-all ${
                  toastInstance.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#111827]">Account request pending</p>
                    <p className="mt-1 text-xs font-bold text-[#6B7280]">
                      {pendingCount} employee account{pendingCount === 1 ? '' : 's'} waiting for approval in User Management.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.dismiss(toastInstance.id)}
                    className="rounded-full border border-[#E5E7EB] px-2 py-0.5 text-xs font-black text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    aria-label="Close notification"
                  >
                    x
                  </button>
                </div>
              </div>
            ),
            {
              id: 'pending-registration-alert',
              duration: 8000,
            }
          );
        }
      } catch (error) {
        // Avoid interrupting normal page work if the background check fails.
      }
    }

    checkPendingRegistrations();
    const intervalId = window.setInterval(checkPendingRegistrations, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user?.role]);

  return null;
}

