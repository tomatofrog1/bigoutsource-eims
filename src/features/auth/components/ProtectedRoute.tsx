import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { UserRole } from '@/src/types';
import type { Capability } from '@/src/lib/permissions';

interface ProtectedRouteProps {
  roles?: UserRole[];
  capability?: Capability;
}

export default function ProtectedRoute({ roles, capability }: ProtectedRouteProps) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F9FAFB]">
        <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#111827] rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-[#6B7280]">Initializing Secure Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'pending' || user.status === 'disabled') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F9FAFB] p-4 text-center">
        <h1 className="text-2xl font-bold text-[#EF4444] mb-2">
          {user.status === 'pending' ? 'Account Pending Approval' : 'Account Disabled'}
        </h1>
        <p className="text-[#6B7280]">
          {user.status === 'pending'
            ? 'Your account request is waiting for Super Admin approval.'
            : 'Your account has been deactivated. Please contact the Super Admin.'}
        </p>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (capability && !can(capability)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
