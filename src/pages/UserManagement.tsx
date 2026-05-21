import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { CheckCircle2, Loader2, Search, ShieldAlert, ShieldCheck, UserX, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { AppUser } from '@/src/types';
import { userService } from '@/src/services/userService';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-green-50 text-green-700';
  if (status === 'pending') return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    try {
      setUsers(asArray(await userService.list()));
    } catch (error: any) {
      toast.error(error.message || 'Unable to load users');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const summary = useMemo(
    () => ({
      pending: users.filter((user) => user.status === 'pending').length,
      active: users.filter((user) => user.status === 'active').length,
      superAdmins: users.filter((user) => user.role === 'super_admin' && user.status === 'active').length,
    }),
    [users]
  );

  const filteredUsers = users.filter((user) => {
    const text = `${user.email} ${user.fullName || ''} ${user.department || ''} ${user.site || ''} ${user.role} ${user.status}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const approveUser = async (id: string) => {
    setBusyId(id);
    try {
      await userService.approve(id);
      toast.success('User approved as Admin');
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to approve user');
    } finally {
      setBusyId(null);
    }
  };

  const disableUser = async (id: string) => {
    setBusyId(id);
    try {
      await userService.disable(id);
      toast.success('User disabled');
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to disable user');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageLayout title="System Permissions & Users">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#111827] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard label="Pending Requests" count={summary.pending} icon={ShieldAlert} color="text-amber-700" bg="bg-amber-50" />
          <SummaryCard label="Active Accounts" count={summary.active} icon={UsersRound} color="text-green-700" bg="bg-green-50" />
          <SummaryCard label="Super Admins" count={summary.superAdmins} icon={ShieldCheck} color="text-[#111827]" bg="bg-[#F3F4F6]" />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Site</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-black text-[#111827] border border-[#E5E7EB]">
                        {(user.fullName || user.email).substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#111827] truncate">{user.fullName || user.email}</p>
                        <p className="text-[10px] text-[#9CA3AF] font-bold tracking-tighter uppercase">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#D1D5DB]" />
                      <span className="text-xs font-black text-[#4B5563] uppercase tracking-tight">{roleLabel(user.role)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#4B5563]">{user.department || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-xs font-bold text-[#4B5563]">{user.site || 'HQ'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${statusClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.status === 'pending' && (
                        <button
                          onClick={() => approveUser(user.uid)}
                          disabled={busyId === user.uid}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-[#111827] text-white rounded-lg text-xs font-black hover:bg-[#374151] disabled:opacity-50"
                        >
                          {busyId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Approve
                        </button>
                      )}
                      {user.status === 'active' && user.role !== 'super_admin' && (
                        <button
                          onClick={() => disableUser(user.uid)}
                          disabled={busyId === user.uid}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#FEE2E2] text-[#B91C1C] rounded-lg text-xs font-black hover:bg-[#FEF2F2] disabled:opacity-50"
                        >
                          {busyId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                          Disable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(isLoading || filteredUsers.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                {isLoading ? <Loader2 className="w-8 h-8 text-[#9CA3AF] animate-spin" /> : <UsersRound className="w-8 h-8 text-[#D1D5DB]" />}
              </div>
              <h3 className="text-lg font-bold text-[#111827]">{isLoading ? 'Loading users' : 'No users found'}</h3>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function SummaryCard({
  label,
  count,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg} ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-[#111827]">{label}</h4>
          <p className="text-xs text-[#6B7280] font-bold uppercase">{count} Total</p>
        </div>
      </div>
    </div>
  );
}
