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
  Laptop
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import logo from '../../public/logo-only-bigoutsource.svg';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
  { icon: Users, label: 'Employee Records', path: '/directory', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
  { icon: Building2, label: 'Departments', path: '/departments', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'] },
  { icon: Laptop, label: 'IT Assets', path: '/assets', roles: ['super_admin', 'admin', 'it_admin', 'viewer'] },
  { icon: FileText, label: 'Reports', path: '/reports', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin'] },
  { icon: History, label: 'Audit Logs', path: '/logs', roles: ['super_admin', 'admin', 'hr_admin', 'it_admin'] },
  { icon: UsersRound, label: 'User Management', path: '/users', roles: ['super_admin'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['super_admin'] },
];

export function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  if (!user) return null;

  return (
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
          onClick={logout}
          className="flex items-center gap-3 text-[#EF4444] hover:bg-[#FEF2F2] w-full px-3 py-2 rounded-lg transition-colors text-left"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </aside>
  );
}
