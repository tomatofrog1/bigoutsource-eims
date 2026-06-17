import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import {
  AlertTriangle,
  Building2,
  Edit3,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { PageLayout } from '@/src/common/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/common/components/SkeletonLoadingMessage';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { accountService } from '@/src/services/accountService';
import { employeeService } from '@/src/features/employees/services/employeeService';

type DepartmentType = 'internal' | 'external';

type Department = {
  id: string;
  name: string;
  accountType: DepartmentType;
  departmentCode: string;
  createdAt?: string;
};

type EmployeeRecord = {
  id?: string;
  employeeId?: string;
  employeeNumber?: string;
  fullName?: string;
  accountAssignment?: string;
  phone?: string;
  address?: string;
  boEmail?: string;
  emailPassword?: string;
  lmsAccount?: string;
  status?: string;
  isArchived?: boolean;
  site?: string;
  pcName?: string;
  rustDeskId?: string;
  rustdeskId?: string;
  esetStatus?: string;
  biosDate?: string;
  activityWatchStatus?: string;
  windowsKey?: string;
};

function suggestDepartmentCode(name = ''): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';

  const initials = words
    .map((w) => w.replace(/[^a-zA-Z]/g, '').charAt(0).toLowerCase())
    .filter(Boolean)
    .join('');

  if (initials.length >= 2) return initials.slice(0, 3);

  const base = (words[0].replace(/[^a-zA-Z]/g, '') || '').toLowerCase();
  return base.slice(0, Math.max(2, Math.min(3, base.length)));
}

function sanitizeDepartmentCode(value = '') {
  return value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
}

function isValidDepartmentCode(code: string) {
  return /^[a-z]{2,3}$/.test(code);
}

function normalizeDepartment(account: any): Department | null {
  if (!account?.id || !account?.name) return null;
  return {
    id: account.id,
    name: account.name,
    accountType: account.accountType || account.account_type || 'external',
    departmentCode: account.departmentCode || account.department_code || '',
    createdAt: account.createdAt || account.created_at || '',
  };
}

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}



function isEmployeeArchived(emp: EmployeeRecord): boolean {
  return emp.isArchived === true || emp.status === 'archived';
}

const DELETE_CONFIRMATION_PHRASE = 'CONFIRM';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const getCachedDeptCounts = () => {
  try {
    const cached = localStorage.getItem('eims_dept_counts');
    if (cached) return JSON.parse(cached);
  } catch {}
  return { internal: 3, external: 2 };
};

export default function Departments() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManageDepartments = can('departments.edit');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const cachedCounts = useMemo(getCachedDeptCounts, []);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [isDeptCodeEdited, setIsDeptCodeEdited] = useState(false);
  const [deptType, setDeptType] = useState<DepartmentType>('internal');
  const [isAddSaving, setIsAddSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState<DepartmentType>('internal');
  const [isEditCodeEdited, setIsEditCodeEdited] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState(false);
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);

  const debouncedDeptName = useDebounce(deptName, 350);
  const debouncedEditName = useDebounce(editName, 350);

  useEffect(() => {
    if (!isDeptCodeEdited) {
      setDeptCode(suggestDepartmentCode(debouncedDeptName));
    }
  }, [debouncedDeptName, isDeptCodeEdited]);

  useEffect(() => {
    if (!isEditCodeEdited) {
      setEditCode(suggestDepartmentCode(debouncedEditName));
    }
  }, [debouncedEditName, isEditCodeEdited]);

  async function loadDepartments() {
    setIsLoading(true);
    try {
      const [accountList, employeeList] = await Promise.all([
        accountService.list(),
        employeeService.list(),
      ]);

      const normalized = asArray(accountList)
        .map(normalizeDepartment)
        .filter((d): d is Department => Boolean(d));

      const counts = asArray(employeeList).reduce<Record<string, number>>((acc, emp) => {
        if (isEmployeeArchived(emp)) return acc;
        const account = emp.accountAssignment || (emp as any).account || '';
        if (account) acc[account] = (acc[account] || 0) + 1;
        return acc;
      }, {});

      setDepartments(normalized);
      setEmployees(asArray(employeeList));
      setEmployeeCounts(counts);

      try {
        const internalCount = normalized.filter(d => d.accountType === 'internal').length;
        const externalCount = normalized.filter(d => d.accountType === 'external').length;
        localStorage.setItem('eims_dept_counts', JSON.stringify({ internal: internalCount, external: externalCount }));
      } catch {}
    } catch (error: any) {
      toast.error(error.message || 'Unable to load departments');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return departments;
    return departments.filter((d) =>
      `${d.name} ${d.departmentCode} ${d.accountType}`.toLowerCase().includes(kw)
    );
  }, [departments, search]);

  const internalDepts = filteredDepartments.filter((d) => d.accountType === 'internal');
  const externalDepts = filteredDepartments.filter((d) => d.accountType === 'external');

  const isDuplicateAddCode = deptCode
    ? departments.some((d) => d.departmentCode === deptCode)
    : false;
  const isAddCodeValid = isValidDepartmentCode(deptCode);

  const isDuplicateEditName = editName.trim()
    ? departments.some(
      (d) => d.id !== selectedDepartment?.id && d.name.toLowerCase() === editName.trim().toLowerCase()
    )
    : false;
  const isDuplicateEditCode = editCode
    ? departments.some((d) => d.id !== selectedDepartment?.id && d.departmentCode === editCode)
    : false;
  const isEditCodeValid = isValidDepartmentCode(editCode);

  const isDeleteConfirmed = deleteInput === DELETE_CONFIRMATION_PHRASE;

  const activeEmployeesFor = useCallback(
    (dept: Department) =>
      employees.filter(
        (emp) =>
          (emp.accountAssignment || (emp as any).account || '') === dept.name &&
          !isEmployeeArchived(emp)
      ),
    [employees]
  );

  const openAddModal = () => {
    setDeptName('');
    setDeptCode('');
    setIsDeptCodeEdited(false);
    setDeptType('internal');
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (isAddSaving) return;
    setIsAddModalOpen(false);
  };

  const openEditModal = (dept: Department) => {
    setOpenMenuId(null);
    setSelectedDepartment(dept);
    setEditName(dept.name);
    setEditCode(dept.departmentCode || suggestDepartmentCode(dept.name));
    setEditType(dept.accountType);
    setIsEditCodeEdited(true);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isEditSaving) return;
    setIsEditModalOpen(false);
    setSelectedDepartment(null);
  };

  const openDeleteModal = (dept: Department) => {
    setOpenMenuId(null);
    setSelectedDepartment(dept);
    setDeleteInput('');
    setDeleteError(false);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleteSaving) return;
    setIsDeleteModalOpen(false);
    setSelectedDepartment(null);
  };

  const manageEmployees = (dept: Department) => {
    setOpenMenuId(null);
    const list = activeEmployeesFor(dept);
    if (!list.length) {
      toast.error('No active employees found for this department');
      return;
    }
    navigate(`/directory?account=${encodeURIComponent(dept.name)}`);
  };



  const addDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) { toast.error('Department name is required'); return; }
    if (!isAddCodeValid) { toast.error('Department code must be 2–3 letters'); return; }
    if (isDuplicateAddCode) { toast.error('Department code already exists. Edit the code to resolve the collision.'); return; }

    setIsAddSaving(true);
    try {
      const created = await accountService.create({
        name: deptName.trim(),
        accountType: deptType,
        departmentCode: deptCode,
      });
      const dept = normalizeDepartment(created);
      if (!dept) throw new Error('Server did not return the created department.');
      setDepartments((prev) => [dept, ...prev.filter((d) => d.id !== dept.id)]);
      toast.success('Department created successfully');
      closeAddModal();
    } catch (err: any) {
      toast.error(err.message || 'Unable to add department');
    } finally {
      setIsAddSaving(false);
    }
  };

  const editDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    const name = editName.trim();
    if (!name) { toast.error('Department name is required'); return; }
    if (!isEditCodeValid) { toast.error('Department code must be 2–3 letters'); return; }
    if (isDuplicateEditName) { toast.error('Department name already exists'); return; }
    if (isDuplicateEditCode) { toast.error('Department code already exists. Edit the code to resolve the collision.'); return; }

    setIsEditSaving(true);
    try {
      const updated = await accountService.update(selectedDepartment.id, {
        name,
        departmentCode: editCode,
        accountType: editType,
      });
      const dept = normalizeDepartment(updated);
      if (!dept) throw new Error('Server did not return the updated department.');

      const prevName = selectedDepartment.name;
      setDepartments((prev) => prev.map((d) => (d.id === dept.id ? dept : d)));
      setEmployees((prev) =>
        prev.map((emp) => {
          const acc = emp.accountAssignment || (emp as any).account || '';
          return acc === prevName ? { ...emp, accountAssignment: dept.name } : emp;
        })
      );
      setEmployeeCounts((prev) => {
        const next = { ...prev };
        if (prevName !== dept.name) {
          next[dept.name] = next[prevName] || 0;
          delete next[prevName];
        }
        return next;
      });
      toast.success('Department updated successfully');
      closeEditModal();
    } catch (err: any) {
      toast.error(err.message || 'Unable to update department');
    } finally {
      setIsEditSaving(false);
    }
  };

  const deleteDepartment = async () => {
    if (!selectedDepartment || !isDeleteConfirmed) return;
    setIsDeleteSaving(true);
    try {
      await accountService.remove(selectedDepartment.id);
      setDepartments((prev) => prev.filter((d) => d.id !== selectedDepartment.id));
      setEmployeeCounts((prev) => {
        const next = { ...prev };
        delete next[selectedDepartment.name];
        return next;
      });
      toast.success('Department deleted successfully');
      closeDeleteModal();
    } catch (err: any) {
      toast.error(err.message || 'Unable to delete department');
    } finally {
      setIsDeleteSaving(false);
    }
  };

  const totalActive = Object.values(employeeCounts).reduce((s, n) => s + n, 0);

  return (
    <PageLayout title="Organization Departments">
      <div className="flex flex-col gap-8">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Departments', icon: Building2, color: 'blue' as const },
                { label: 'Internal', icon: Shield, color: 'indigo' as const },
                { label: 'External', icon: Zap, color: 'violet' as const },
                { label: 'Active Employees', icon: Users, color: 'emerald' as const }
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#F3F4F6] bg-white p-4 shadow-sm">
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    stat.color === 'blue' && 'bg-blue-50 text-blue-200',
                    stat.color === 'indigo' && 'bg-indigo-50 text-indigo-200',
                    stat.color === 'violet' && 'bg-violet-50 text-violet-200',
                    stat.color === 'emerald' && 'bg-emerald-50 text-emerald-200'
                  )}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mb-1" />
                    <p className="text-[0.6875rem] font-semibold text-[#9CA3AF]">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : departments.length > 0 ? (
            <motion.div key="content-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Departments" value={departments.length} icon={Building2} color="blue" />
              <StatCard label="Internal" value={internalDepts.length} icon={Shield} color="indigo" />
              <StatCard label="External" value={externalDepts.length} icon={Zap} color="violet" />
              <StatCard label="Active Employees" value={totalActive} icon={Users} color="emerald" />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments…"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-4 text-sm text-[#111827] shadow-sm outline-none transition-all focus:ring-2 focus:ring-[#111827]"
            />
          </div>

          {canManageDepartments && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#374151]"
            >
              <Plus className="h-4 w-4" />
              New Department
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="space-y-10 relative">
              {['Internal', 'External'].map((title, idx) => (
                <section key={title} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-0.5 rounded-full bg-[#111827]" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-[#6B7280]">{title}</h2>
                    <div className="h-4 w-6 rounded-full bg-gray-200 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(idx === 0 ? cachedCounts.internal : cachedCounts.external)].map((_, i) => (
                      <div key={i} className="group relative flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-start justify-between">
                          <div className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-xl',
                            title === 'Internal' ? 'bg-blue-50 text-blue-200' : 'bg-violet-50 text-violet-200'
                          )}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="h-8 w-8 rounded-xl bg-gray-200 animate-pulse" />
                        </div>
                        <div className="h-6 w-3/4 rounded bg-gray-200 animate-pulse mb-4 mt-2" />
                        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-[#F9FAFB] pt-4">
                          <div>
                            <p className="mb-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#9CA3AF]">Code</p>
                            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                          </div>
                          <div>
                            <p className="mb-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#9CA3AF]">Active Staff</p>
                            <div className="h-4 w-8 bg-gray-200 rounded animate-pulse mt-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              <SkeletonLoadingMessage message="Loading department structures..." />
            </motion.div>
          ) : (
            <motion.div key="content-groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-10">
              <DepartmentGroup
                title="Internal"
                departments={internalDepts}
                employeeCounts={employeeCounts}
                canManageDepartments={canManageDepartments}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId((cur) => (cur === id ? null : id))}
                onCloseMenu={() => setOpenMenuId(null)}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onManageEmployees={manageEmployees}
              />
              <DepartmentGroup
                title="External"
                departments={externalDepts}
                employeeCounts={employeeCounts}
                canManageDepartments={canManageDepartments}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId((cur) => (cur === id ? null : id))}
                onCloseMenu={() => setOpenMenuId(null)}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onManageEmployees={manageEmployees}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {(!isLoading && filteredDepartments.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white py-20 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6]">
              <Building2 className="h-8 w-8 text-[#D1D5DB]" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">
              {search ? 'No matching departments' : 'No departments yet'}
            </h3>
            {!search && canManageDepartments && (
              <p className="mt-1 text-sm text-[#9CA3AF]">Click <strong>New Department</strong> to get started.</p>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={closeAddModal} maxWidth="max-w-lg">
        {isAddModalOpen && (
          <>
            <ModalHeader
            title="New Department"
            subtitle="Departments become account choices in Employee Records."
            onClose={closeAddModal}
            icon={<Building2 className="h-5 w-5 text-[#6B7280]" />}
            iconBg="bg-[#F3F4F6]"
          />

          <form onSubmit={addDepartment} className="space-y-5 p-6">
            <FormField label="Department Name">
              <input
                value={deptName}
                onChange={(e) => {
                  setDeptName(e.target.value);
                  setIsDeptCodeEdited(false);
                }}
                placeholder="e.g. Human Capital"
                autoFocus
                className="form-input"
              />
            </FormField>

            <FormField
              label="Department Code"
              hint={
                isDuplicateAddCode
                  ? 'Code already taken — edit manually to resolve the collision (e.g. append a digit).'
                  : !deptCode
                    ? 'Auto-generated from the department name.'
                    : !isAddCodeValid
                      ? 'Code must be 2–3 lowercase letters.'
                      : 'Looks good!'
              }
              hintColor={
                isDuplicateAddCode || (!deptCode ? false : !isAddCodeValid)
                  ? 'error'
                  : deptCode
                    ? 'success'
                    : 'default'
              }
            >
              <div className="relative">
                <input
                  value={deptCode}
                  onChange={(e) => {
                    setIsDeptCodeEdited(true);
                    setDeptCode(sanitizeDepartmentCode(e.target.value));
                  }}
                  placeholder="hc"
                  maxLength={3}
                  className={cn(
                    'form-input pr-14',
                    isDuplicateAddCode || (!deptCode ? false : !isAddCodeValid)
                      ? 'border-red-300 focus:ring-red-500'
                      : deptCode && isAddCodeValid && !isDuplicateAddCode
                        ? 'border-green-400 focus:ring-[#111827]'
                        : ''
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF]">
                  {deptCode.length}/3
                </span>
              </div>
            </FormField>

            <div>
              <span className="mb-2 block text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">
                Department Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['internal', 'external'] as DepartmentType[]).map((type) => {
                  const isActive = deptType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDeptType(type)}
                      className={cn(
                        'relative rounded-xl border px-4 py-2.5 text-xs font-black capitalize transition-colors z-10',
                        isActive
                          ? 'border-[#111827] text-white'
                          : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="deptTypeBgBlack"
                          className="absolute inset-0 z-[-1] rounded-xl bg-[#111827]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {type === 'internal' ? 'Internal' : 'External'}
                    </button>
                  );
                })}
              </div>
            </div>

            <ModalFooter>
              <button type="button" onClick={closeAddModal} disabled={isAddSaving} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddSaving || isDuplicateAddCode || !isAddCodeValid}
                className="btn-primary"
              >
                {isAddSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Department
              </button>
            </ModalFooter>
          </form>
          </>
        )}
      </Modal>

      <Modal isOpen={isEditModalOpen && !!selectedDepartment} onClose={closeEditModal} maxWidth="max-w-lg">
        {selectedDepartment && (
          <>
            <ModalHeader
            title="Edit Department"
            subtitle="Update the name and code used across employee records."
            onClose={closeEditModal}
            icon={<Edit3 className="h-5 w-5 text-[#6B7280]" />}
            iconBg="bg-[#F3F4F6]"
          />

          <form onSubmit={editDepartment} className="space-y-5 p-6">
            <FormField label="Department Name" error={isDuplicateEditName ? 'This name is already used by another department.' : undefined}>
              <input
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setIsEditCodeEdited(false);
                }}
                autoFocus
                className={cn('form-input', isDuplicateEditName && 'border-red-300 focus:ring-red-500')}
              />
            </FormField>

            <FormField
              label="Department Code"
              hint={
                isDuplicateEditCode
                  ? 'Code already taken — edit manually to resolve the collision (e.g. append a digit).'
                  : !isEditCodeValid
                    ? 'Code must be 2–3 lowercase letters.'
                    : 'Looks good!'
              }
              hintColor={isDuplicateEditCode || !isEditCodeValid ? 'error' : 'success'}
            >
              <div className="relative">
                <input
                  value={editCode}
                  onChange={(e) => {
                    setIsEditCodeEdited(true);
                    setEditCode(sanitizeDepartmentCode(e.target.value));
                  }}
                  placeholder="hc"
                  maxLength={3}
                  className={cn(
                    'form-input pr-14',
                    isDuplicateEditCode || !isEditCodeValid
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-green-400 focus:ring-[#111827]'
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF]">
                  {editCode.length}/3
                </span>
              </div>
            </FormField>

            <div>
              <span className="mb-2 block text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">
                Department Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['internal', 'external'] as DepartmentType[]).map((type) => {
                  const isActive = editType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditType(type)}
                      className={cn(
                        'relative rounded-xl border px-4 py-2.5 text-xs font-black capitalize transition-colors z-10',
                        isActive
                          ? 'border-[#111827] text-white'
                          : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="editDeptTypeBgBlack"
                          className="absolute inset-0 z-[-1] rounded-xl bg-[#111827]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {type === 'internal' ? 'Internal' : 'External'}
                    </button>
                  );
                })}
              </div>
            </div>

            <ModalFooter>
              <button type="button" onClick={closeEditModal} disabled={isEditSaving} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditSaving || isDuplicateEditName || isDuplicateEditCode || !isEditCodeValid}
                className="btn-primary"
              >
                {isEditSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </ModalFooter>
          </form>
          </>
        )}
      </Modal>

      <Modal isOpen={isDeleteModalOpen && !!selectedDepartment} onClose={closeDeleteModal} maxWidth="max-w-md">
        {selectedDepartment && (
          <>
            <ModalHeader
            title="Delete Department"
            subtitle="This action is permanent and cannot be undone."
            onClose={closeDeleteModal}
            icon={<Trash2 className="h-5 w-5 text-red-600" />}
            iconBg="bg-red-100"
          />

          <div className="space-y-5 p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wide">Permanent Deletion Warning</span>
              </div>
              <ul className="mt-2 space-y-1 pl-6 text-[0.6875rem] font-medium leading-relaxed text-red-600">
                <li>All department data will be permanently removed.</li>
                <li>Departments with active employees cannot be deleted.</li>
                <li>Historical records may reference this department.</li>
              </ul>
            </div>

            <p className="text-sm text-[#4B5563]">
              You are about to permanently delete{' '}
              <span className="font-black text-[#111827]">&ldquo;{selectedDepartment.name}&rdquo;</span>.
            </p>

            <FormField
              label="Confirm Deletion"
              hint={
                deleteError
                  ? `Enter exactly "${DELETE_CONFIRMATION_PHRASE}" (case-sensitive).`
                  : `Type "${DELETE_CONFIRMATION_PHRASE}" to enable the Delete button.`
              }
              hintColor={deleteError ? 'error' : 'default'}
            >
              <input
                value={deleteInput}
                onChange={(e) => {
                  setDeleteInput(e.target.value);
                  setDeleteError(e.target.value.length > 0 && e.target.value !== DELETE_CONFIRMATION_PHRASE);
                }}
                placeholder={DELETE_CONFIRMATION_PHRASE}
                autoComplete="off"
                className={cn(
                  'form-input',
                  deleteError
                    ? 'border-red-300 focus:ring-red-500'
                    : isDeleteConfirmed
                      ? 'border-green-400 focus:ring-[#111827]'
                      : ''
                )}
              />
            </FormField>

            <ModalFooter>
              <button type="button" onClick={closeDeleteModal} disabled={isDeleteSaving} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteDepartment}
                disabled={isDeleteSaving || !isDeleteConfirmed}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Permanently
              </button>
            </ModalFooter>
          </div>
          </>
        )}
      </Modal>

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #E5E7EB;
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 2px rgba(17,24,39,0.15);
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          background: #111827;
          padding: 0.625rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 900;
          color: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #374151; }
        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn-secondary {
          border-radius: 0.75rem;
          border: 1px solid #E5E7EB;
          background: white;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #4B5563;
          transition: all 0.15s;
        }
        .btn-secondary:hover:not(:disabled) { background: #F9FAFB; color: #111827; }
        .btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
    </PageLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  color: 'blue' | 'indigo' | 'violet' | 'emerald';
}) {
  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', num: 'text-blue-700' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', num: 'text-indigo-700' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', num: 'text-violet-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', num: 'text-emerald-700' },
  }[color];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#F3F4F6] bg-white p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colors.bg)}>
        <Icon className={cn('h-5 w-5', colors.icon)} />
      </div>
      <div>
        <p className={cn('text-2xl font-black leading-none', colors.num)}>{value}</p>
        <p className="mt-0.5 text-[0.6875rem] font-semibold text-[#9CA3AF]">{label}</p>
      </div>
    </div>
  );
}

function Modal({
  isOpen,
  children,
  onClose,
  maxWidth = 'max-w-lg',
}: {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className={cn('w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl', maxWidth)}
      >
        {children}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
  icon,
  iconBg,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-[#F3F4F6] px-6 py-5">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-black text-[#111827]">{title}</h2>
        <p className="mt-0.5 text-xs font-medium text-[#6B7280]">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl p-1.5 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
      {children}
    </div>
  );
}

type HintColor = 'default' | 'error' | 'success';

function FormField({
  label,
  hint,
  hintColor = 'default',
  error,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  hintColor?: HintColor;
  error?: string;
  children: React.ReactNode;
}) {
  const hintClass = {
    default: 'text-[#9CA3AF]',
    error: 'text-red-600',
    success: 'text-emerald-600',
  }[hintColor];

  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">
        {label}
      </span>
      {children}
      {error && <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p>}
      {!error && hint && <p className={cn('mt-1.5 text-xs font-semibold', hintClass)}>{hint}</p>}
    </label>
  );
}

function DepartmentGroup({
  title,
  departments,
  employeeCounts,
  canManageDepartments,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
  onManageEmployees,
}: {
  title: string;
  departments: Department[];
  employeeCounts: Record<string, number>;
  canManageDepartments: boolean;
  openMenuId: string | null;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onManageEmployees: (dept: Department) => void;
}) {
  if (!departments.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-0.5 rounded-full bg-[#111827]" />
        <h2 className="text-xs font-black uppercase tracking-widest text-[#6B7280]">{title}</h2>
        <span className="rounded-full border border-[#E5E7EB] bg-[#F3F4F6] px-2 py-0.5 text-[0.625rem] font-black text-[#6B7280]">
          {departments.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
            whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
          >
            <DepartmentCard
              department={dept}
              count={employeeCounts[dept.name] || 0}
              canManage={canManageDepartments}
              menuOpen={openMenuId === dept.id}
              onToggleMenu={() => onToggleMenu(dept.id)}
              onCloseMenu={onCloseMenu}
              onEdit={() => onEdit(dept)}
              onDelete={() => onDelete(dept)}
              onManageEmployees={() => onManageEmployees(dept)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function DepartmentCard({
  department,
  count,
  canManage,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
  onManageEmployees,
}: {
  department: Department;
  count: number;
  canManage: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageEmployees: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isInternal = department.accountType === 'internal';

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu();
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen, onCloseMenu]);

  return (
    <div className="group relative flex flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-[box-shadow,border-color] duration-300 hover:shadow-xl">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            isInternal ? 'bg-blue-50' : 'bg-violet-50'
          )}>
            <Building2 className={cn('h-5 w-5', isInternal ? 'text-blue-600' : 'text-violet-600')} />
          </div>

          {canManage && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
                aria-label={`Actions for ${department.name}`}
                aria-expanded={menuOpen}
                className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#374151]"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              <AnimatePresence>
              {menuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                  transition={{ duration: 0.15 }} 
                  className="absolute right-0 top-[calc(100%+6px)] z-30 w-52 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-xl shadow-black/10"
                >
                  <DepartmentAction icon={Edit3} label="Edit Department" onClick={onEdit} />
                  <DepartmentAction icon={Users} label="Manage Employees" onClick={onManageEmployees} />
                  <div className="my-1 border-t border-[#F3F4F6]" />
                  <DepartmentAction icon={Trash2} label="Delete Department" onClick={onDelete} destructive />
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <h3 className="mb-4 truncate text-xl font-black text-[#111827]">{department.name}</h3>

        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-[#F9FAFB] pt-4">
          <div>
            <p className="mb-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#9CA3AF]">Code</p>
            <p className="text-sm font-bold text-[#111827]">
              {department.departmentCode || '—'}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#9CA3AF]">Active Staff</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-black text-[#111827]">{count}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DepartmentAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold transition-all',
        destructive
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
