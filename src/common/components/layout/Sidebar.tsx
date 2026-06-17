import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  FileText,
  History,
  UsersRound,
  Laptop,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import type { Capability } from '@/src/lib/permissions';
import logo from '@/src/public/logo-only-bigoutsource.svg';
import { useState } from 'react';

// `capability` gates visibility; items without one are shown to everyone.
const navItems: { icon: LucideIcon; label: string; path: string; capability?: Capability }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Employee Records', path: '/directory', capability: 'employees.view' },
  { icon: Building2, label: 'Departments', path: '/departments', capability: 'departments.view' },
  { icon: Laptop, label: 'IT Assets', path: '/assets', capability: 'assets.view' },
  { icon: FileText, label: 'Reports', path: '/reports', capability: 'reports.view' },
  { icon: History, label: 'Audit Logs', path: '/logs', capability: 'auditlogs.view' },
  { icon: UsersRound, label: 'User Management', path: '/users', capability: 'users.manage' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { logout, user, can } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRetracted, setIsRetracted] = useState(() => {
    try {
      const saved = localStorage.getItem('eims_sidebar_retracted');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsRetracted((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('eims_sidebar_retracted', JSON.stringify(next));
      return next;
    });
  };

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
      <aside className={cn(
        "h-full border-r border-[#E5E7EB] bg-white flex flex-col shrink-0 transition-all duration-300 relative z-50",
        "h-full border-r flex flex-col shrink-0 transition-all duration-300 relative",
        isRetracted ? "w-20" : "w-64"
      )} style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className={cn("py-6", isRetracted ? "px-4" : "px-6")}>
          <div className={cn("flex items-center mb-8 overflow-hidden", isRetracted ? "justify-center" : "gap-2")}>
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center shrink-0">
              <img src={logo} alt="" className="w-8 h-8" />
            </div>
            <AnimatePresence initial={false}>
              {!isRetracted && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-l tracking-tight whitespace-nowrap overflow-hidden"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Big Outsource EIMS
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <nav className="space-y-1">
            {navItems.filter((item) => !item.capability || can(item.capability)).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between py-2 rounded-lg group relative z-0",
                    isRetracted ? "px-0 justify-center w-12 mx-auto" : "px-3",
                    isActive
                      ? ""
                      : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  )}
                  style={{ color: isActive ? 'var(--color-surface)' : 'var(--color-text-secondary)' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-0 rounded-lg -z-10"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                      initial={false}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className={cn("flex items-center", isRetracted ? "justify-center" : "gap-3")}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    
                    {isRetracted && (
                      <div className="absolute left-full ml-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] flex items-center translate-x-2 group-hover:translate-x-0 pointer-events-none">
                        <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#111827] mr-[-1px]"></div>
                        <div className="bg-[#111827] text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                          {item.label}
                        </div>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {!isRetracted && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {!isRetracted && isActive && (
                    <motion.div layoutId="activeNav" className="w-1.5 h-1.5 rounded-full bg-white mr-2 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={cn("mt-auto border-t", isRetracted ? "p-4 space-y-4" : "p-4 space-y-4")} style={{ borderColor: 'var(--color-border)' }}>
          <div className={cn(isRetracted ? "flex justify-center" : "px-3")}>
            <div className={cn("flex items-center", isRetracted ? "justify-center" : "gap-3")}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[0.625rem] font-bold border shrink-0 relative group cursor-help"
                style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
              >
                {user.email.substring(0, 2).toUpperCase()}

                {isRetracted && (
                  <div className="absolute left-full ml-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] flex items-center translate-x-2 group-hover:translate-x-0 pointer-events-none">
                    <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#111827] mr-[-1px]"></div>
                    <div className="bg-[#111827] text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex flex-col items-start">
                      <span className="truncate">{user.email}</span>
                      <span className="text-[0.5625rem] text-gray-400 font-bold uppercase tracking-wider">{user.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                )}
              </div>
              <AnimatePresence initial={false}>
                {!isRetracted && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="min-w-0 overflow-hidden"
                  >
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{user.email}</p>
                    <p className="text-[0.625rem] uppercase font-bold tracking-tighter truncate" style={{ color: 'var(--color-text-muted)' }}>{user.role.replace('_', ' ')}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className={cn("flex", isRetracted ? "flex-col items-center gap-4" : "flex-row items-center gap-2 w-full")}>
            <button
              onClick={() => setShowLogoutModal(true)}
              className={cn(
                "flex items-center text-[#EF4444] hover:bg-[#FEF2F2] transition-colors relative group",
                isRetracted ? "p-2 justify-center mx-auto rounded-lg w-10 h-10" : "flex-1 gap-3 px-3 py-2 rounded-lg text-left"
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />

              {isRetracted && (
                <div className="absolute left-full ml-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] flex items-center translate-x-2 group-hover:translate-x-0 pointer-events-none">
                  <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#EF4444] mr-[-1px]"></div>
                  <div className="bg-[#EF4444] text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                    Log out
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {!isRetracted && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Log out
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={toggleSidebar}
              className={cn(
                "flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors rounded-lg",
                isRetracted ? "w-10 h-10 p-2" : "w-10 h-10 shrink-0"
              )}
              aria-label={isRetracted ? "Expand sidebar" : "Retract sidebar"}
            >
              {isRetracted ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Confirm logout</h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Are you sure you want to log out and end your current session?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  className="rounded-lg p-1 transition-colors"
                  style={{ color: 'var(--color-text-faint)' }}
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
                  className="rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)' }}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
