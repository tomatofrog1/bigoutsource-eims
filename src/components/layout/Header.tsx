import { Bell } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

export function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const name = user?.fullName || user?.email || 'User';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-8">
      <h1 className="text-lg font-semibold text-[#111827]">{title}</h1>
      
      <div className="flex items-center gap-6">
        
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-[#4B5563] hover:bg-[#F3F4F6] rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-[#E5E7EB]">
            <div className="text-right">
              <p className="text-sm font-medium text-[#111827]">{name}</p>
              <p className="text-xs text-[#6B7280]">{user?.role?.replace('_', ' ') || 'User'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
