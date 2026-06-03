import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, CheckCircle2, ChevronRight, Loader2, Pencil, Search, ShieldAlert, ShieldCheck, Trash2, UserX, UsersRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { motion, AnimatePresence } from 'motion/react';
import { USER_ACCOUNTS_REFRESHED_EVENT } from '@/src/components/layout/Header';
import { AppUser, UserRole } from '@/src/types';
import { userService } from '@/src/services/userService';
import { authService } from '@/src/services/authService';
import { siteService } from '@/src/services/siteService';

const EDITABLE_ROLES: UserRole[] = ['viewer', 'admin'];
const EDITABLE_ACCOUNT_STATUSES = [
  { value: 'active' as const, label: 'Active' },
  { value: 'disabled' as const, label: 'Inactive' },
];

type EditableAccountStatus = (typeof EDITABLE_ACCOUNT_STATUSES)[number]['value'];

type UserEditDraft = {
  department: string;
  site: string;
  role: UserRole;
  status: EditableAccountStatus;
};

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

function statusLabel(status: string) {
  if (status === 'disabled') return 'inactive';
  return status;
}

function normalizeSiteNames(value: any) {
  return asArray(value)
    .map((site: any) => String(site?.name || '').trim())
    .filter(Boolean);
}

function toEditDraft(user: AppUser): UserEditDraft {
  let role: UserRole = 'viewer';
  if (user.role === 'admin' || user.role === 'viewer') {
    role = user.role;
  } else if (user.role === 'hr_admin' || user.role === 'it_admin') {
    role = 'admin';
  }
  const status: EditableAccountStatus = user.status === 'active' ? 'active' : 'disabled';

  return {
    department: user.department && user.department !== 'Unassigned' ? user.department : '',
    site: user.site || '',
    role,
    status,
  };
}


function getInitials(name: string, email: string) {
  if (name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
  }
  return email.substring(0, 2).toUpperCase();
}

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UserEditDraft | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [disablingUserId, setDisablingUserId] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);

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

  useEffect(() => {
    function syncRefreshedAccounts(event: Event) {
      const accountList = (event as CustomEvent<{ users?: AppUser[] }>).detail?.users;
      if (Array.isArray(accountList)) {
        setUsers(accountList);
        setIsLoading(false);
      }
    }

    window.addEventListener(USER_ACCOUNTS_REFRESHED_EVENT, syncRefreshedAccounts);
    return () => window.removeEventListener(USER_ACCOUNTS_REFRESHED_EVENT, syncRefreshedAccounts);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        const [departments, sites] = await Promise.all([
          authService.internalDepartments(),
          siteService.list(),
        ]);

        if (!isMounted) return;

        setDepartmentOptions(asArray(departments).map((name) => String(name).trim()).filter(Boolean));
        const names = normalizeSiteNames(sites);
        setSiteOptions(names.length ? names : ['San Pablo City (HQ)', 'Candelaria', 'WFH', 'Hybrid']);
      } catch (error: any) {
        if (isMounted) {
          toast.error(error.message || 'Unable to load department and site options');
        }
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(
    () => ({
      pending: users.filter((user) => user.status === 'pending').length,
      active: users.filter((user) => user.status === 'active').length,
      admins: users.filter((user) => user.role === 'admin' && user.status === 'active').length,
      superAdmins: users.filter((user) => user.role === 'super_admin' && user.status === 'active').length,
      viewers: users.filter((user) => user.role === 'viewer' && user.status === 'active').length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    let result = users.filter((user) => {
      const text = `${user.email} ${user.fullName || ''} ${user.department || ''} ${user.site || ''} ${user.role} ${user.status}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole = roleFilter
        ? roleFilter === 'admin'
          ? ['admin', 'hr_admin', 'it_admin'].includes(user.role)
          : user.role === roleFilter
        : true;
      const matchesStatus = statusFilter ? user.status === statusFilter : true;
      return matchesSearch && matchesRole && matchesStatus;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.key] || '').toLowerCase();
        const bVal = String((b as any)[sortConfig.key] || '').toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, search, roleFilter, statusFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const approveUser = async (id: string) => {
    setBusyId(id);
    try {
      await userService.approve(id);
      toast.success('User approved');
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to approve user');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDisableUser = async (id: string) => {
    setBusyId(id);
    try {
      await userService.disable(id);
      toast.success('User disabled');
      setDisablingUserId(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to disable user');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUserAccount = async () => {
    if (!deleteUser) return;

    setBusyId(deleteUser.uid);
    try {
      await userService.remove(deleteUser.uid);
      toast.success('User deleted');
      setDeleteUser(null);
      if (editingId === deleteUser.uid) cancelEditing();
      if (disablingUserId === deleteUser.uid) setDisablingUserId(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete user');
    } finally {
      setBusyId(null);
    }
  };

  const startEditing = (user: AppUser) => {
    setDisablingUserId(null);
    setEditingId(user.uid);
    setEditDraft(toEditDraft(user));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveUser = async (id: string) => {
    if (!editDraft) return;

    if (!editDraft.department.trim()) {
      toast.error('Select a department');
      return;
    }

    if (!editDraft.site.trim()) {
      toast.error('Select a site');
      return;
    }

    setBusyId(id);
    try {
      await userService.update(id, {
        department: editDraft.department.trim(),
        site: editDraft.site.trim(),
        role: editDraft.role,
        status: editDraft.status,
      });
      toast.success('User updated');
      cancelEditing();
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to update user');
    } finally {
      setBusyId(null);
    }
  };

  const departmentSelectOptions = useMemo(() => {
    const options = [...departmentOptions];
    if (editDraft?.department && !options.includes(editDraft.department)) {
      options.unshift(editDraft.department);
    }
    return options;
  }, [departmentOptions, editDraft?.department]);

  const siteSelectOptions = useMemo(() => {
    const options = [...siteOptions];
    if (editDraft?.site && !options.includes(editDraft.site)) {
      options.unshift(editDraft.site);
    }
    return options;
  }, [siteOptions, editDraft?.site]);

  return (
    <PageLayout title="System Permissions & Users" contentClassName="w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full md:flex-1 z-0">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#111827] outline-none"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto z-10 relative">
            <AnimatedSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'viewer', label: 'Viewer' },
                { value: 'admin', label: 'Admin (All Depts)' },
                { value: 'super_admin', label: 'Super Admin' },
              ]}
            />
            <AnimatedSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'disabled', label: 'Inactive' },
              ]}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm flex items-center gap-4 animate-pulse">
                  <div className="w-11 h-11 rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="content-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              <SummaryCard label="Active Accounts" count={summary.active} icon={UsersRound} color="text-green-700" bg="bg-green-50" />
              <SummaryCard label="Pending Requests" count={summary.pending} icon={ShieldAlert} color="text-amber-700" bg="bg-amber-50" />
              <SummaryCard label="Viewers" count={summary.viewers} icon={UsersRound} color="text-purple-700" bg="bg-purple-50" />
              <SummaryCard label="Admins" count={summary.admins} icon={ShieldCheck} color="text-blue-700" bg="bg-blue-50" />
              <SummaryCard label="Super Admins" count={summary.superAdmins} icon={ShieldCheck} color="text-[#111827]" bg="bg-[#F3F4F6]" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto relative">
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <SortableHeader label="User" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Role" sortKey="role" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Department" sortKey="department" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Site" sortKey="site" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                    <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[#F3F4F6] last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                          <div className="flex-1 space-y-2"><div className="h-4 w-32 bg-gray-200 rounded"></div><div className="h-3 w-40 bg-gray-200 rounded"></div></div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 rounded-lg"></div></td>
                      <td className="px-6 py-4"><div className="h-9 w-24 bg-gray-200 rounded-lg ml-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <SkeletonLoadingMessage message="Loading account information..." />
            </motion.div>
          ) : (
            <motion.div key="content-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <SortableHeader label="User" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Role" sortKey="role" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Department" sortKey="department" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Site" sortKey="site" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                    <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {paginatedUsers.map((user, index) => {
                    const isEditing = editingId === user.uid;
                    const canEdit = user.role !== 'super_admin';
    
                    return (
                      <motion.tr 
                        key={user.uid} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
                        className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-black text-[#111827] border border-[#E5E7EB]">
                              {getInitials(user.fullName || '', user.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#111827] truncate">{user.fullName || user.email}</p>
                              <p className="text-[10px] text-[#9CA3AF] font-bold tracking-tighter uppercase">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && editDraft ? (
                            <AnimatedSelect
                              value={editDraft.role}
                              onChange={(val) =>
                                setEditDraft((current) =>
                                  current ? { ...current, role: val as UserRole } : current
                                )
                              }
                              options={EDITABLE_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
                              disabled={busyId === user.uid}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-[#D1D5DB]" />
                              <span className="text-xs font-black text-[#4B5563] uppercase tracking-tight">{roleLabel(user.role)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && editDraft ? (
                            <AnimatedSelect
                              value={editDraft.department}
                              onChange={(val) =>
                                setEditDraft((current) => (current ? { ...current, department: val } : current))
                              }
                              options={[
                                { value: '', label: 'Select department' },
                                ...departmentSelectOptions.map((dept) => ({ value: dept, label: dept }))
                              ]}
                              disabled={busyId === user.uid || !departmentSelectOptions.length}
                            />
                          ) : (
                            <span className="text-xs font-bold text-[#4B5563]">{user.department || 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && editDraft ? (
                            <AnimatedSelect
                              value={editDraft.site}
                              onChange={(val) =>
                                setEditDraft((current) => (current ? { ...current, site: val } : current))
                              }
                              options={[
                                { value: '', label: 'Select site' },
                                ...siteSelectOptions.map((site) => ({ value: site, label: site }))
                              ]}
                              disabled={busyId === user.uid || !siteSelectOptions.length}
                            />
                          ) : (
                            <span className="text-xs font-bold text-[#4B5563]">{user.site || 'San Pablo City (HQ)'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && editDraft ? (
                            <AnimatedSelect
                              value={editDraft.status}
                              onChange={(val) =>
                                setEditDraft((current) =>
                                  current ? { ...current, status: val as EditableAccountStatus } : current
                                )
                              }
                              options={EDITABLE_ACCOUNT_STATUSES}
                              disabled={busyId === user.uid}
                            />
                          ) : (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${statusClass(user.status)}`}>
                              {statusLabel(user.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveUser(user.uid)}
                                  disabled={busyId === user.uid}
                                  aria-label="Save changes"
                                  className="inline-flex items-center justify-center w-9 h-9 bg-[#111827] text-white rounded-lg hover:bg-[#374151] disabled:opacity-50"
                                >
                                  {busyId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={busyId === user.uid}
                                  aria-label="Cancel editing"
                                  className="inline-flex items-center justify-center w-9 h-9 bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {canEdit && (
                                  <>
                                    <button
                                      onClick={() => startEditing(user)}
                                      disabled={busyId === user.uid || editingId !== null || disablingUserId !== null}
                                      aria-label="Edit user"
                                      className="inline-flex items-center justify-center w-9 h-9 bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDisablingUserId(null);
                                        setDeleteUser(user);
                                      }}
                                      disabled={busyId === user.uid || editingId !== null || disablingUserId !== null}
                                      aria-label="Delete user"
                                      className="inline-flex items-center justify-center w-9 h-9 bg-white border border-[#FEE2E2] text-[#B91C1C] rounded-lg hover:bg-[#FEF2F2] disabled:opacity-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {user.status === 'pending' && (
                                  <button
                                    onClick={() => approveUser(user.uid)}
                                    disabled={busyId === user.uid || editingId !== null || disablingUserId !== null}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-[#111827] text-white rounded-lg text-xs font-black hover:bg-[#374151] disabled:opacity-50"
                                  >
                                    {busyId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Approve
                                  </button>
                                )}
                                {user.status === 'active' && canEdit && (
                                  disablingUserId === user.uid ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setDisablingUserId(null)}
                                        disabled={busyId === user.uid}
                                        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-black text-[#4B5563] hover:bg-[#F9FAFB] disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => confirmDisableUser(user.uid)}
                                        disabled={busyId === user.uid}
                                        className="inline-flex items-center gap-2 rounded-lg bg-[#B91C1C] px-3 py-2 text-xs font-black text-white hover:bg-[#991B1B] disabled:opacity-50"
                                      >
                                        {busyId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                        Confirm Disable
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        cancelEditing();
                                        setDisablingUserId(user.uid);
                                      }}
                                      disabled={busyId === user.uid || editingId !== null || disablingUserId !== null}
                                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#FEE2E2] text-[#B91C1C] rounded-lg text-xs font-black hover:bg-[#FEF2F2] disabled:opacity-50"
                                    >
                                      <UserX className="w-4 h-4" />
                                      Disable
                                    </button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
    
              {(!isLoading && filteredUsers.length === 0) && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UsersRound className="w-8 h-8 text-[#D1D5DB]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#111827]">No users found</h3>
                </div>
              )}

              {(!isLoading && filteredUsers.length > 0) && (
                <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-bold text-[#6B7280]">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-[#E5E7EB] bg-white text-xs font-bold text-[#4B5563] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1 hidden sm:flex">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        
                        if (pageNum < 1 || pageNum > totalPages) return null;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                              currentPage === pageNum
                                ? 'bg-[#111827] text-white shadow-sm'
                                : 'text-[#4B5563] hover:bg-[#E5E7EB]'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-[#E5E7EB] bg-white text-xs font-bold text-[#4B5563] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        

      </div>

      <AnimatePresence>
        {deleteUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            >
            <div className="border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-lg font-black text-[#111827]">Delete User</h2>
              <p className="mt-1 text-xs font-bold text-[#6B7280]">This permanently removes the account and cannot be undone.</p>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-sm font-bold text-[#4B5563]">
                Delete <span className="text-[#111827]">{deleteUser.fullName || deleteUser.email}</span>?
              </p>

              <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                <button
                  type="button"
                  onClick={() => setDeleteUser(null)}
                  disabled={busyId === deleteUser.uid}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteUserAccount}
                  disabled={busyId === deleteUser.uid}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:opacity-60"
                >
                  {busyId === deleteUser.uid && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

function AnimatedSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label || 'Select...';

  return (
    <div className="relative min-w-[140px] w-full max-w-[180px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-2 py-1.5 text-left text-xs font-bold text-[#4B5563] outline-none transition-all focus:ring-2 focus:ring-[#111827] disabled:opacity-50 disabled:cursor-not-allowed ${
          !value && options.some((o) => o.value === '')
            ? 'border-red-300 bg-red-50 hover:border-red-400'
            : 'border-[#E5E7EB] hover:border-[#CBD5E1]'
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform text-[#9CA3AF] ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
            >
              <div className="max-h-48 overflow-y-auto py-1">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-[#F3F4F6] ${
                      value === opt.value ? 'bg-[#F9FAFB] text-[#111827]' : 'text-[#4B5563]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
}) {
  const isActiveSort = currentSort.key === sortKey;
  const SortIcon = isActiveSort ? (currentSort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="h-14 px-6 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={isActiveSort ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`flex max-w-full items-center gap-1.5 rounded-lg py-2 text-left uppercase tracking-widest transition-colors hover:text-[#111827] ${
          isActiveSort ? 'text-[#111827]' : ''
        }`}
      >
        <span className="truncate">{label}</span>
        <SortIcon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </th>
  );
}
