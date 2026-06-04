/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { TextSizeProvider } from './contexts/TextSizeContext';
import { AuthProvider } from './contexts/AuthContext';
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
            <Route path="/directory" element={<Directory />} />
            <Route path="/employee/:id" element={<EmployeeProfile />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<ProtectedRoute roles={['super_admin', 'admin', 'hr_admin']} />}>
              <Route path="/employee-imports/issues" element={<EmployeeImportReview />} />
              <Route path="/employee-imports/:batchId" element={<EmployeeImportReview />} />
            </Route>
            <Route element={<ProtectedRoute roles={['super_admin']} />}>
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

