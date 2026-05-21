/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

export default function App() {
  return (
    <AuthProvider>
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
            <Route element={<ProtectedRoute roles={['super_admin']} />}>
              <Route path="/users" element={<UserManagement />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

