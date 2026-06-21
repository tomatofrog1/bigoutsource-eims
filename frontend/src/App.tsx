/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { TextSizeProvider } from './contexts/TextSizeContext';
import { AuthProvider } from './contexts/AuthContext';
import React, { Suspense } from 'react';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { GlobalNotifications } from './components/GlobalNotifications';

// Lazy-loaded pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Directory = React.lazy(() => import('./pages/Directory'));
const EmployeeProfile = React.lazy(() => import('./pages/EmployeeProfile'));
const Departments = React.lazy(() => import('./pages/Departments'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Login = React.lazy(() => import('./pages/Login'));
const Assets = React.lazy(() => import('./pages/Assets'));
const Reports = React.lazy(() => import('./pages/Reports'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const EmployeeImportReview = React.lazy(() => import('./pages/EmployeeImportReview'));

import { QueryProvider } from './providers/QueryProvider';

export default function App() {
  return (
    <QueryProvider>
    <AuthProvider>
    <ThemeProvider>
    <TextSizeProvider>
      <Router>
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
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
        </Suspense>
        <Toaster position="bottom-right" />
        <GlobalNotifications />
      </Router>
    </TextSizeProvider>
    </ThemeProvider>
    </AuthProvider>
    </QueryProvider>
  );
}

