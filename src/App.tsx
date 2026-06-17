/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { TextSizeProvider } from './contexts/TextSizeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import Dashboard from './features/dashboard/pages/Dashboard';
import Directory from './features/employees/pages/Directory';
import EmployeeProfile from './features/employees/pages/EmployeeProfile';
import Departments from './features/employees/pages/Departments';
import Settings from './features/settings/pages/Settings';
import Login from './features/auth/pages/Login';
import Assets from './features/assets/pages/Assets';
import Reports from './features/reports/pages/Reports';
import AuditLogs from './features/reports/pages/AuditLogs';
import UserManagement from './features/settings/pages/UserManagement';
import EmployeeImportReview from './features/imports/pages/EmployeeImportReview';

export default function App() {
  return (
    <AuthProvider>
    <ThemeProvider>
    <TextSizeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route element={<ProtectedRoute capability="employees.view" />}>
              <Route path="/directory" element={<Directory />} />
              <Route path="/employee/:id" element={<EmployeeProfile />} />
            </Route>
            <Route element={<ProtectedRoute capability="departments.view" />}>
              <Route path="/departments" element={<Departments />} />
            </Route>
            <Route path="/settings" element={<Settings />} />
            <Route element={<ProtectedRoute capability="assets.view" />}>
              <Route path="/assets" element={<Assets />} />
            </Route>
            <Route element={<ProtectedRoute capability="reports.view" />}>
              <Route path="/reports" element={<Reports />} />
            </Route>
            <Route element={<ProtectedRoute capability="auditlogs.view" />}>
              <Route path="/logs" element={<AuditLogs />} />
            </Route>
            <Route element={<ProtectedRoute capability="imports.manage" />}>
              <Route path="/employee-imports/issues" element={<EmployeeImportReview />} />
              <Route path="/employee-imports/:batchId" element={<EmployeeImportReview />} />
            </Route>
            <Route element={<ProtectedRoute capability="users.manage" />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </Router>
    </TextSizeProvider>
    </ThemeProvider>
    </AuthProvider>
  );
}

