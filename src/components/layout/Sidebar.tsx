import { cn } from '@/src/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ShieldAlert, 
  Settings, 
  LogOut,
  FileText,
  History,
  UsersRound,
  Laptop,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import logo from '../../public/logo-only-bigoutsource.svg';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
  { icon: Users, label: 'Employee Records', path: '/directory', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
  { icon: Building2, label: 'Departments', path: '/departments', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
  { icon: Laptop, label: 'IT Assets', path: '/assets', roles: ['super_admin', 'admin', 'it_admin', 'viewer'] },
  { icon: FileText, label: 'Reports', path: '/reports', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin'] },
  { icon: History, label: 'Audit Logs', path: '/logs', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin'] },
  { icon: UsersRound, label: 'User Management', path: '/users', roles: ['super_admin'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
];

export function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      <aside className="w-64 h-full border-r border-[#E5E7EB] bg-white flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <img  src={logo} alt="" />
            </div>
            <span className="font-bold text-l tracking-tight text-[#111827]">Big Outsource EIMS</span>
          </div>

          <nav className="space-y-1">
            {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg transition-colors group",
                    isActive 
                      ? "bg-[#111827] text-white" 
                      : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div layoutId="activeNav" className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-[#E5E7EB] space-y-4">
          <div className="px-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-bold text-[#111827] border border-[#E5E7EB]">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827] truncate">{user.email}</p>
                <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-tighter">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 text-[#EF4444] hover:bg-[#FEF2F2] w-full px-3 py-2 rounded-lg transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF2F2]">
                  <LogOut className="h-5 w-5 text-[#DC2626]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#111827]">Confirm logout</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">Are you sure you want to log out and end your current session?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-50"
                aria-label="Close logout confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="rounded-xl bg-[#F3F4F6] py-3 text-sm font-bold text-[#374151] transition-all hover:bg-[#E5E7EB] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] py-3 text-sm font-bold text-white transition-all hover:bg-[#B91C1C] disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  'Log out'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
