import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, CheckCircle2, ChevronRight, Loader2, Pencil, Search, ShieldCheck, SlidersHorizontal, Trash2, UserPlus, UserX, UsersRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { motion, AnimatePresence } from 'motion/react';
import { USER_ACCOUNTS_REFRESHED_EVENT } from '@/src/components/layout/Header';
import { AppUser, UserRole } from '@/src/types';
import { userService } from '@/src/services/userService';
import { authService } from '@/src/services/authService';
import { siteService } from '@/src/services/siteService';
import RegisterForm from '@/src/components/auth/RegisterForm';
import { roleService, type CapabilityItem, type Role } from '@/src/services/roleService';
import { RolesPanel } from '@/src/components/roles/RolesPanel';
import { CapabilityChecklist } from '@/src/components/roles/CapabilityChecklist';

const EDITABLE_ACCOUNT_STATUSES = [
  { value: 'active' as const, label: 'Active' },
  { value: 'disabled' as const, label: 'Disabled' },
];

type EditableAccountStatus = (typeof EDITABLE_ACCOUNT_STATUSES)[number]['value'];

function ActionTooltip({ label }: { label: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] flex flex-col items-center translate-y-2 group-hover:translate-y-0 pointer-events-none">
      <div className="bg-[#111827] text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
        {label}
      </div>
      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#111827] mt-[-1px]"></div>
    </div>
  );
}

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
  return status;
}

function normalizeSiteNames(value: any) {
  return asArray(value)
    .map((site: any) => String(site?.name || '').trim())
    .filter(Boolean);
}

function toEditDraft(user: AppUser): UserEditDraft {
  const role: UserRole = user.role === 'super_admin' ? 'admin' : user.role;
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UserEditDraft | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [disableUser, setDisableUser] = useState<AppUser | null>(null);
  const [enableUser, setEnableUser] = useState<AppUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [view, setView] = useState<'users' | 'roles'>('users');
  const [capabilityCatalog, setCapabilityCatalog] = useState<CapabilityItem[]>([]);
  const [permsTarget, setPermsTarget] = useState<AppUser | null>(null);
  const [permsDraft, setPermsDraft] = useState<string[]>([]);
  const [permsSaving, setPermsSaving] = useState(false);

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
        const [departments, sites, roleList, catalog] = await Promise.all([
          authService.internalDepartments(),
          siteService.list(),
          roleService.list(),
          roleService.capabilities(),
        ]);

        if (!isMounted) return;

        setRoles(asArray(roleList));
        setCapabilityCatalog(asArray(catalog));
        setDepartmentOptions(asArray(departments).map((name) => String(name).trim()).filter(Boolean));
        const names = normalizeSiteNames(sites);
        setSiteOptions(names.length ? names : ['HQ', 'Candelaria', 'WFH', 'Hybrid']);
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

    if (sortConfig?.key) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.key] || '').toLowerCase();
        const bVal = String((b as any)[sortConfig.key] || '').toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => {
        const aVal = String(a.fullName || '').toLowerCase();
        const bVal = String(b.fullName || '').toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
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

  const confirmDisableUser = async (id: string) => {
    setBusyId(id);
    try {
      await userService.disable(id);
      toast.success('User disabled');
      setDisableUser(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to disable user');
    } finally {
      setBusyId(null);
    }
  };

  const enableUserAccount = async (id: string) => {
    setBusyId(id);
    try {
      await userService.update(id, { status: 'active' });
      toast.success('User enabled');
      setEnableUser(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to enable user');
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
      if (disableUser?.uid === deleteUser.uid) setDisableUser(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete user');
    } finally {
      setBusyId(null);
    }
  };

  const startEditing = (user: AppUser) => {
    setDisableUser(null);
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

  const rolesBySlug = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((role) => map.set(role.slug, role));
    return map;
  }, [roles]);

  const openPermissions = (account: AppUser) => {
    const roleCaps = rolesBySlug.get(account.role)?.capabilities || [];
    const effective = Array.isArray(account.capabilityOverrides) ? account.capabilityOverrides : roleCaps;
    setPermsTarget(account);
    setPermsDraft([...effective]);
  };

  const togglePerm = (key: string) => {
    setPermsDraft((current) => (current.includes(key) ? current.filter((cap) => cap !== key) : [...current, key]));
  };

  const savePermissions = async (reset = false) => {
    if (!permsTarget) return;
    setPermsSaving(true);
    try {
      await userService.setCapabilities(permsTarget.uid, reset ? null : permsDraft);
      toast.success(reset ? 'Reverted to role defaults' : 'Permissions updated');
      setPermsTarget(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Unable to update permissions');
    } finally {
      setPermsSaving(false);
    }
  };

  return (
    <PageLayout title="System Permissions & Users" contentClassName="w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6">
        <div className="inline-flex w-fit items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          {(['users', 'roles'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              className="min-h-10 rounded-lg px-4 py-2 text-sm font-bold transition-colors"
              style={view === tab
                ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-surface)' }
                : { color: 'var(--color-text-muted)' }}
            >
              {tab === 'users' ? 'Users' : 'Roles & Permissions'}
            </button>
          ))}
        </div>

        {view === 'roles' ? (
          <RolesPanel />
        ) : (
        <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 z-10 relative">
              <AnimatedSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'viewer', label: 'Viewer' },
                  { value: 'admin', label: 'Admin (All Departments)' },
                  { value: 'super_admin', label: 'Super Admin' },
                ]}
                className="min-w-[160px]"
              />
              <AnimatedSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'disabled', label: 'Inactive' },
                ]}
                className="min-w-[140px]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#374151] active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Register Account
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="flex flex-col lg:flex-row gap-6">
              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={`sk-summary-${i}`} className="p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm flex items-center gap-4 animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="content-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Active Accounts" count={summary.active} icon={UsersRound} color="text-green-700" bg="bg-green-50" />
                <SummaryCard label="Super Admins" count={summary.superAdmins} icon={ShieldCheck} color="text-[#111827]" bg="bg-[#F3F4F6]" />
                <SummaryCard label="Admins" count={summary.admins} icon={ShieldCheck} color="text-blue-700" bg="bg-blue-50" />
                <SummaryCard label="Viewers" count={summary.viewers} icon={UsersRound} color="text-purple-700" bg="bg-purple-50" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm relative">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <SortableHeader label="User" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} className="w-[22%]" />
                    <SortableHeader label="Role" sortKey="role" currentSort={sortConfig} onSort={handleSort} className="w-[16%]" />
                    <SortableHeader label="Department" sortKey="department" currentSort={sortConfig} onSort={handleSort} className="w-[18%]" />
                    <SortableHeader label="Site" sortKey="site" currentSort={sortConfig} onSort={handleSort} className="w-[15%]" />
                    <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} className="w-[12%]" />
                    <th className="px-4 py-4 w-[17%] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest text-right"></th>
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
            <motion.div key="content-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <SortableHeader label="User" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} className="w-[22%]" />
                    <SortableHeader label="Role" sortKey="role" currentSort={sortConfig} onSort={handleSort} className="w-[16%]" />
                    <SortableHeader label="Department" sortKey="department" currentSort={sortConfig} onSort={handleSort} className="w-[18%]" />
                    <SortableHeader label="Site" sortKey="site" currentSort={sortConfig} onSort={handleSort} className="w-[15%]" />
                    <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} className="w-[12%]" />
                    <th className="px-4 py-4 w-[17%] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest text-right"></th>
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
                        <td className="px-4 py-4">
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
                          <AnimatePresence mode="wait">
                            {isEditing && editDraft ? (
                              <motion.div key="edit-role" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
                                <AnimatedSelect
                                  value={editDraft.role}
                                  onChange={(val) =>
                                    setEditDraft((current) =>
                                      current ? { ...current, role: val as UserRole } : current
                                    )
                                  }
                                  options={roles.filter((role) => role.slug !== 'super_admin').map((role) => ({ value: role.slug, label: role.name }))}
                                  disabled={busyId === user.uid}
                                  className="w-full"
                                />
                              </motion.div>
                            ) : (
                              <motion.div key="view-role" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }} className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-[#D1D5DB]" />
                                <span className="text-xs font-black text-[#4B5563] uppercase tracking-tight">{roleLabel(user.role)}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                        <td className="px-6 py-4">
                          <AnimatePresence mode="wait">
                            {isEditing && editDraft ? (
                              <motion.div key="edit-dept" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
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
                                  className="w-full"
                                />
                              </motion.div>
                            ) : (
                              <motion.div key="view-dept" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
                                <span className="text-xs font-bold text-[#4B5563]">{user.department || 'Unassigned'}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                        <td className="px-6 py-4">
                          <AnimatePresence mode="wait">
                            {isEditing && editDraft ? (
                              <motion.div key="edit-site" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
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
                                  className="w-full"
                                />
                              </motion.div>
                            ) : (
                              <motion.div key="view-site" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
                                <span className="text-xs font-bold text-[#4B5563]">{user.site || 'HQ'}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                        <td className="px-6 py-4">
                          <AnimatePresence mode="wait">
                            {isEditing && editDraft ? (
                              <motion.div key="edit-status" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
                                <AnimatedSelect
                                  value={editDraft.status}
                                  onChange={(val) =>
                                    setEditDraft((current) =>
                                      current ? { ...current, status: val as EditableAccountStatus } : current
                                    )
                                  }
                                  options={EDITABLE_ACCOUNT_STATUSES}
                                  disabled={busyId === user.uid}
                                  className="w-full"
                                />
                              </motion.div>
                            ) : (
                              <motion.div key="view-status" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${statusClass(user.status)}`}>
                                  {statusLabel(user.status)}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveUser(user.uid)}
                                  disabled={busyId === user.uid}
                                  aria-label="Save changes"
                                  className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-[#111827] text-white rounded-lg hover:bg-[#374151] disabled:opacity-50"
                                >
                                  {busyId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  <ActionTooltip label="Save Changes" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={busyId === user.uid}
                                  aria-label="Cancel editing"
                                  className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                  <ActionTooltip label="Cancel" />
                                </button>
                              </>
                            ) : (
                              <>
                                {canEdit && (
                                  <button
                                    onClick={() => startEditing(user)}
                                    disabled={busyId === user.uid || editingId !== null || disableUser !== null || enableUser !== null}
                                    aria-label="Edit user"
                                    className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    <ActionTooltip label="Edit User" />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => openPermissions(user)}
                                    disabled={busyId === user.uid || editingId !== null || disableUser !== null || enableUser !== null}
                                    aria-label="Edit permissions"
                                    className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50"
                                  >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    <ActionTooltip label="Permissions" />
                                  </button>
                                )}
                                {user.status === 'active' && canEdit && (
                                  <button
                                    onClick={() => {
                                      cancelEditing();
                                      setDisableUser(user);
                                    }}
                                    disabled={busyId === user.uid || editingId !== null || disableUser !== null}
                                    className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-white border border-[#FEE2E2] text-[#B91C1C] rounded-lg hover:bg-[#FEF2F2] disabled:opacity-50"
                                  >
                                    <UserX className="w-4 h-4" />
                                    <ActionTooltip label="Disable User" />
                                  </button>
                                )}
                                {user.status === 'disabled' && canEdit && (
                                  <button
                                    onClick={() => setEnableUser(user)}
                                    disabled={busyId === user.uid || editingId !== null || disableUser !== null || enableUser !== null}
                                    className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-white border border-[#D1FAE5] text-[#059669] rounded-lg hover:bg-[#ECFDF5] disabled:opacity-50"
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                    <ActionTooltip label="Enable User" />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setDisableUser(null);
                                      setDeleteUser(user);
                                      setDeleteInput('');
                                    }}
                                    disabled={busyId === user.uid || editingId !== null || disableUser !== null || enableUser !== null}
                                    aria-label="Delete user"
                                    className="group relative inline-flex h-10 w-10 min-w-10 shrink-0 items-center justify-center bg-white border border-[#FEE2E2] text-[#B91C1C] rounded-lg hover:bg-[#FEF2F2] disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <ActionTooltip label="Delete User" />
                                  </button>
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
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === pageNum
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
        </>
        )}
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
              <div className="flex items-start gap-4 border-b border-[#E5E7EB] px-6 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-[#111827]">Delete User</h2>
                  <p className="mt-1 text-xs font-bold text-[#6B7280]">This action is permanent and cannot be undone.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteUser(null);
                    setDeleteInput('');
                  }}
                  className="rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wide">Permanent Deletion Warning</span>
                  </div>
                  <ul className="mt-2 space-y-1 pl-6 text-[11px] font-medium leading-relaxed text-red-600 list-disc">
                    <li>All user data and access will be permanently removed.</li>
                    <li>The user will be immediately logged out of all sessions.</li>
                    <li>Historical audit logs will retain the user's ID.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
                  <p className="text-sm font-bold text-[#111827] mb-0.5">{deleteUser.fullName || 'No Name'}</p>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">{deleteUser.email}</p>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-[#9CA3AF] font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Role</span>
                      <span className="font-bold text-[#4B5563]">{roleLabel(deleteUser.role)}</span>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF] font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Department</span>
                      <span className="font-bold text-[#4B5563]">{deleteUser.department || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#4B5563]">
                  You are about to permanently delete <span className="font-black text-[#111827]">&ldquo;{deleteUser.fullName || deleteUser.email}&rdquo;</span>.
                </p>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black text-[#111827]">Confirm Deletion</label>
                  </div>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="CONFIRM"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-bold outline-none transition-all ${deleteInput === 'CONFIRM'
                        ? 'border-green-400 focus:ring-2 focus:ring-[#111827]'
                        : deleteInput.length > 0
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500'
                          : 'border-[#E5E7EB] focus:ring-2 focus:ring-[#111827]'
                      }`}
                  />
                  <p className="text-[11px] font-bold text-[#6B7280] mt-2">Type "CONFIRM" to enable the Delete button.</p>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteUser(null);
                      setDeleteInput('');
                    }}
                    disabled={busyId === deleteUser.uid}
                    className="min-h-11 whitespace-nowrap rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={deleteUserAccount}
                    disabled={busyId === deleteUser.uid || deleteInput !== 'CONFIRM'}
                    className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:opacity-60"
                  >
                    {busyId === deleteUser.uid && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {disableUser && (
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
              <div className="flex items-start gap-4 border-b border-[#E5E7EB] px-6 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <UserX className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-[#111827]">Disable User</h2>
                  <p className="mt-1 text-xs font-bold text-[#6B7280]">This will prevent the user from accessing the system.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisableUser(null)}
                  className="rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wide">Account Suspension Warning</span>
                  </div>
                  <ul className="mt-2 space-y-1 pl-6 text-[11px] font-medium leading-relaxed text-orange-700 list-disc">
                    <li>User will immediately lose all access to the system.</li>
                    <li>Active sessions will be terminated.</li>
                    <li>You can re-enable this account at any time.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
                  <p className="text-sm font-bold text-[#111827] mb-0.5">{disableUser.fullName || 'No Name'}</p>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">{disableUser.email}</p>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-[#9CA3AF] font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Role</span>
                      <span className="font-bold text-[#4B5563]">{roleLabel(disableUser.role)}</span>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF] font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Department</span>
                      <span className="font-bold text-[#4B5563]">{disableUser.department || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#4B5563]">
                  You are about to suspend access for <span className="font-black text-[#111827]">&ldquo;{disableUser.fullName || disableUser.email}&rdquo;</span>.
                </p>

                <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                  <button
                    type="button"
                    onClick={() => setDisableUser(null)}
                    disabled={busyId === disableUser.uid}
                    className="min-h-11 whitespace-nowrap rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDisableUser(disableUser.uid)}
                    disabled={busyId === disableUser.uid}
                    className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-700 disabled:opacity-60"
                  >
                    {busyId === disableUser.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                    Suspend Account
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {enableUser && (
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
              <div className="flex items-start gap-4 border-b border-[#E5E7EB] px-6 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-[#111827]">Enable User</h2>
                  <p className="mt-1 text-xs font-bold text-[#6B7280]">Restore the user's access to the system.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableUser(null)}
                  className="rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wide">Account Restoration</span>
                  </div>
                  <ul className="mt-2 space-y-1 pl-6 text-[11px] font-medium leading-relaxed text-emerald-700 list-disc">
                    <li>User will regain their previous access permissions.</li>
                    <li>They will be able to log in using their existing credentials.</li>
                    <li>You can disable this account again if necessary.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
                  <p className="text-sm font-bold text-[#111827] mb-0.5">{enableUser.fullName || 'No Name'}</p>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">{enableUser.email}</p>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-[#9CA3AF] font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Role</span>
                      <span className="font-bold text-[#4B5563]">{roleLabel(enableUser.role)}</span>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF] font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Department</span>
                      <span className="font-bold text-[#4B5563]">{enableUser.department || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#4B5563]">
                  You are about to restore access for <span className="font-black text-[#111827]">&ldquo;{enableUser.fullName || enableUser.email}&rdquo;</span>.
                </p>

                <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                  <button
                    type="button"
                    onClick={() => setEnableUser(null)}
                    disabled={busyId === enableUser.uid}
                    className="min-h-11 whitespace-nowrap rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => enableUserAccount(enableUser.uid)}
                    disabled={busyId === enableUser.uid}
                    className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#059669] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-[#047857] disabled:opacity-60"
                  >
                    {busyId === enableUser.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Restore Account
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRegister && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
            onClick={() => setShowRegister(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-[#E5E7EB] bg-white p-8 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="absolute right-4 top-4 z-10 rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                aria-label="Close registration"
              >
                <X className="h-5 w-5" />
              </button>
              <RegisterForm
                onSuccess={async (newUser) => {
                  setShowRegister(false);
                  try {
                    // Accounts created by an admin are activated immediately with the
                    // chosen role (update also records this admin as the approver).
                    await userService.update(newUser.uid, { role: newUser.role, status: 'active' });
                    toast.success(`Account created and activated as ${roleLabel(newUser.role)}`);
                  } catch (error: any) {
                    toast.error(error?.message || 'Account created, but activation failed — approve it manually.');
                  }
                  await loadUsers();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {permsTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
            onClick={() => setPermsTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="min-w-0">
                  <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>Account Permissions</h2>
                  <p className="mt-1 truncate text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {permsTarget.fullName || permsTarget.email} — {Array.isArray(permsTarget.capabilityOverrides) ? 'custom override' : `inheriting ${roleLabel(permsTarget.role)} defaults`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPermsTarget(null)}
                  className="rounded-lg p-2 transition-colors hover:bg-[#F3F4F6]"
                  style={{ color: 'var(--color-text-faint)' }}
                  aria-label="Close permissions"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <CapabilityChecklist catalog={capabilityCatalog} selected={permsDraft} onToggle={togglePerm} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => savePermissions(true)}
                  disabled={permsSaving || !Array.isArray(permsTarget.capabilityOverrides)}
                  className="text-xs font-bold text-[#4B5563] underline transition-opacity hover:text-[#111827] disabled:no-underline disabled:opacity-40"
                >
                  Reset to role defaults
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPermsTarget(null)}
                    disabled={permsSaving}
                    className="min-h-11 whitespace-nowrap rounded-xl border bg-white px-5 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:bg-[#F9FAFB] disabled:opacity-50"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => savePermissions(false)}
                    disabled={permsSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-[#374151] disabled:opacity-60"
                  >
                    {permsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save
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
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label || 'Select...';

  return (
    <div className={`relative ${className || 'min-w-[140px]'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] hover:bg-[#F9FAFB] focus:ring-2 focus:ring-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform text-[#9CA3AF] ${isOpen ? 'rotate-90' : ''
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
              className="absolute left-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714] min-w-full w-max"
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
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6] ${value === opt.value ? 'bg-[#EFF6FF]' : ''
                      }`}
                  >
                    <span className={`truncate text-sm font-semibold ${value === opt.value ? 'text-[#2563EB]' : 'text-[#4B5563]'}`}>{opt.label}</span>
                    {value === opt.value && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
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
  className,
}: {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActiveSort = currentSort?.key === sortKey;
  const SortIcon = isActiveSort ? (currentSort?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className={`h-14 px-6 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle ${className || ''}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={isActiveSort ? (currentSort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`flex max-w-full items-center gap-1.5 rounded-lg py-2 text-left uppercase tracking-widest transition-colors hover:text-[#111827] ${isActiveSort ? 'text-[#111827]' : ''
          }`}
      >
        <span className="truncate">{label}</span>
        <SortIcon className={`h-3.5 w-3.5 shrink-0 ${isActiveSort ? 'text-[#111827]' : 'text-[#9CA3AF]'}`} />
      </button>
    </th>
  );
}
