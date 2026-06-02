import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { Building2, Download, Edit3, Loader2, MoreVertical, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { accountService } from '@/src/services/accountService';
import { employeeService } from '@/src/services/employeeService';

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
  site?: string;
  pcName?: string;
  rustDeskId?: string;
  rustdeskId?: string;
  remoteId?: string;
  esetStatus?: string;
  biosDate?: string;
  activityWatchStatus?: string;
  windowsKey?: string;
};

function suggestDepartmentCode(name = '') {
  return name
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, '').charAt(0).toLowerCase())
    .join('');
}

function sanitizeDepartmentCode(value = '') {
  return value.toLowerCase().replace(/[^a-z]/g, '');
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

function safeFilePart(value = '') {
  return value.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Department';
}

const DELETE_CONFIRMATION_PHRASE = 'Confirm Delete';

export default function Departments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageDepartments = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameDepartmentCode, setRenameDepartmentCode] = useState('');
  const [isRenameDepartmentCodeEdited, setIsRenameDepartmentCodeEdited] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [hasDeleteConfirmationError, setHasDeleteConfirmationError] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [isDepartmentCodeEdited, setIsDepartmentCodeEdited] = useState(false);
  const [departmentType, setDepartmentType] = useState<DepartmentType>('internal');
  const [isSaving, setIsSaving] = useState(false);
  const [isActionSaving, setIsActionSaving] = useState(false);

  async function loadDepartments() {
    setIsLoading(true);
    try {
      const [accountList, employeeList] = await Promise.all([accountService.list(), employeeService.list()]);
      const normalizedDepartments = asArray(accountList).map(normalizeDepartment).filter((item): item is Department => Boolean(item));
      const counts = asArray(employeeList).reduce<Record<string, number>>((record, employee) => {
        const account = employee.accountAssignment || employee.account || '';
        if (account) record[account] = (record[account] || 0) + 1;
        return record;
      }, {});

      setDepartments(normalizedDepartments);
      setEmployees(asArray(employeeList));
      setEmployeeCounts(counts);
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
    const keyword = search.trim().toLowerCase();
    if (!keyword) return departments;
    return departments.filter((department) => `${department.name} ${department.accountType}`.toLowerCase().includes(keyword));
  }, [departments, search]);
  const internalDepartments = filteredDepartments.filter((department) => department.accountType === 'internal');
  const externalDepartments = filteredDepartments.filter((department) => department.accountType === 'external');
  const duplicateDepartmentCode = departmentCode
    ? departments.some((department) => department.departmentCode === departmentCode)
    : false;
  const duplicateRename = renameValue.trim()
    ? departments.some((department) => department.id !== selectedDepartment?.id && department.name.toLowerCase() === renameValue.trim().toLowerCase())
    : false;
  const duplicateRenameDepartmentCode = renameDepartmentCode
    ? departments.some((department) => department.id !== selectedDepartment?.id && department.departmentCode === renameDepartmentCode)
    : false;
  const isDeleteConfirmed = deleteConfirmation === DELETE_CONFIRMATION_PHRASE;

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setDepartmentName('');
    setDepartmentCode('');
    setIsDepartmentCodeEdited(false);
    setDepartmentType('internal');
  };

  const closeActionModals = (force = false) => {
    if (isActionSaving && !force) return;
    setSelectedDepartment(null);
    setRenameValue('');
    setRenameDepartmentCode('');
    setIsRenameDepartmentCodeEdited(false);
    setDeleteConfirmation('');
    setHasDeleteConfirmationError(false);
    setIsRenameModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  const openRenameModal = (department: Department) => {
    setOpenMenuId(null);
    setSelectedDepartment(department);
    setRenameValue(department.name);
    setRenameDepartmentCode(department.departmentCode || suggestDepartmentCode(department.name));
    setIsRenameDepartmentCodeEdited(false);
    setIsRenameModalOpen(true);
  };

  const openDeleteModal = (department: Department) => {
    setOpenMenuId(null);
    setSelectedDepartment(department);
    setDeleteConfirmation('');
    setHasDeleteConfirmationError(false);
    setIsDeleteModalOpen(true);
  };

  const manageEmployees = (department: Department) => {
    setOpenMenuId(null);
    navigate(`/directory?account=${encodeURIComponent(department.name)}`);
  };

  const employeesForDepartment = (department: Department) =>
    employees.filter((employee) => (employee.accountAssignment || (employee as any).account || '') === department.name);

  const exportEmployees = (department: Department) => {
    setOpenMenuId(null);
    const departmentEmployees = employeesForDepartment(department);

    if (!departmentEmployees.length) {
      toast.error('No employees found for this department');
      return;
    }

    const rows = departmentEmployees.map((employee) => ({
      ID: employee.employeeId || employee.employeeNumber || employee.id || '',
      Name: employee.fullName || (employee as any).name || '',
      Account: employee.accountAssignment || (employee as any).account || '',
      'Phone Number': employee.phone || '',
      Address: employee.address || '',
      'Bigoutsource Email': employee.boEmail || (employee as any).bigoutsourceEmail || '',
      'Email Password': employee.emailPassword || '',
      'LMS Account': employee.lmsAccount || '',
      Status: employee.status || '',
      Site: employee.site || '',
      'PC Name': employee.pcName || '',
      'RustDesk ID': employee.rustDeskId || employee.rustdeskId || '',
      'Remote ID': employee.remoteId || '',
      ESET: employee.esetStatus || '',
      'BIOS Date': employee.biosDate || '',
      ActivityWatch: employee.activityWatchStatus || '',
      'Windows License Key': employee.windowsKey || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `${safeFilePart(department.name)}_Employees.xlsx`);
    toast.success('Department employees exported');
  };

  const renameDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDepartment) return;

    const name = renameValue.trim();
    if (!name) {
      toast.error('Department name is required');
      return;
    }

    if (!renameDepartmentCode) {
      toast.error('Department code is required');
      return;
    }

    if (duplicateRename) {
      toast.error('Department name already exists. Enter a unique name.');
      return;
    }

    if (duplicateRenameDepartmentCode) {
      toast.error('Department code already exists. Enter a unique code.');
      return;
    }

    setIsActionSaving(true);
    try {
      const updated = await accountService.update(selectedDepartment.id, { name, departmentCode: renameDepartmentCode });
      const department = normalizeDepartment(updated);
      if (!department) throw new Error('The server did not return the updated department.');

      const previousName = selectedDepartment.name;
      setDepartments((current) => current.map((item) => (item.id === department.id ? department : item)));
      setEmployees((current) =>
        current.map((employee) => {
          const account = employee.accountAssignment || (employee as any).account || '';
          return account === previousName ? { ...employee, accountAssignment: department.name } : employee;
        })
      );
      setEmployeeCounts((current) => {
        const next = { ...current };
        if (previousName !== department.name) {
          next[department.name] = next[previousName] || 0;
          delete next[previousName];
        }
        return next;
      });
      toast.success('Department updated');
      closeActionModals(true);
    } catch (error: any) {
      toast.error(error.message || 'Unable to rename department');
    } finally {
      setIsActionSaving(false);
    }
  };

  const deleteDepartment = async () => {
    if (!selectedDepartment) return;
    if (!isDeleteConfirmed) {
      setHasDeleteConfirmationError(true);
      toast.error(`Type "${DELETE_CONFIRMATION_PHRASE}" to confirm deletion.`);
      return;
    }

    setIsActionSaving(true);
    try {
      await accountService.remove(selectedDepartment.id);
      setDepartments((current) => current.filter((department) => department.id !== selectedDepartment.id));
      setEmployeeCounts((current) => {
        const next = { ...current };
        delete next[selectedDepartment.name];
        return next;
      });
      toast.success('Department deleted');
      closeActionModals(true);
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete department');
    } finally {
      setIsActionSaving(false);
    }
  };

  const updateDepartmentName = (value: string) => {
    setDepartmentName(value);
    if (!isDepartmentCodeEdited) setDepartmentCode(suggestDepartmentCode(value));
  };

  const updateRenameDepartmentName = (value: string) => {
    setRenameValue(value);
    if (!isRenameDepartmentCodeEdited) setRenameDepartmentCode(suggestDepartmentCode(value));
  };

  const addDepartment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!departmentName.trim()) {
      toast.error('Department name is required');
      return;
    }

    if (!departmentCode) {
      toast.error('Department code is required');
      return;
    }

    if (duplicateDepartmentCode) {
      toast.error('Department code already exists. Enter a unique code.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await accountService.create({
        name: departmentName.trim(),
        accountType: departmentType,
        departmentCode,
      });
      const department = normalizeDepartment(created);
      if (!department) throw new Error('The server did not return the created department.');

      setDepartments((current) => [department, ...current.filter((item) => item.id !== department.id)]);
      toast.success('Department added');
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Unable to add department');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout title="Organization Departments">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search departments..."
              className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#111827]"
            />
          </div>
          {canManageDepartments && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white shadow-sm transition-shadow hover:bg-[#374151]"
            >
              <Plus className="h-4 w-4" />
              New Department
            </button>
          )}
        </div>

        <div className="space-y-8">
          <DepartmentGroup
            title="Internal"
            departments={internalDepartments}
            employeeCounts={employeeCounts}
            canManageDepartments={canManageDepartments}
            openMenuId={openMenuId}
            onToggleMenu={(departmentId) => setOpenMenuId((current) => (current === departmentId ? null : departmentId))}
            onRename={openRenameModal}
            onDelete={openDeleteModal}
            onManageEmployees={manageEmployees}
            onExportEmployees={exportEmployees}
          />
          <DepartmentGroup
            title="External"
            departments={externalDepartments}
            employeeCounts={employeeCounts}
            canManageDepartments={canManageDepartments}
            openMenuId={openMenuId}
            onToggleMenu={(departmentId) => setOpenMenuId((current) => (current === departmentId ? null : departmentId))}
            onRename={openRenameModal}
            onDelete={openDeleteModal}
            onManageEmployees={manageEmployees}
            onExportEmployees={exportEmployees}
          />
        </div>

        {(isLoading || filteredDepartments.length === 0) && (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6]">
              {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" /> : <Building2 className="h-8 w-8 text-[#D1D5DB]" />}
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{isLoading ? 'Loading departments' : 'No departments found'}</h3>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-[#111827]">New Department</h2>
                <p className="text-xs font-bold text-[#6B7280]">Departments added here become account choices in Employee Records.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={addDepartment} className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Department Name</span>
                <input
                  value={departmentName}
                  onChange={(event) => updateDepartmentName(event.target.value)}
                  placeholder="Department name"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Department Code</span>
                <input
                  value={departmentCode}
                  onChange={(event) => {
                    setIsDepartmentCodeEdited(true);
                    setDepartmentCode(sanitizeDepartmentCode(event.target.value));
                  }}
                  placeholder="hc"
                  className={cn(
                    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all focus:ring-2',
                    duplicateDepartmentCode ? 'border-red-300 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#111827]'
                  )}
                />
                <p className={cn('mt-2 text-xs font-bold', duplicateDepartmentCode ? 'text-red-600' : 'text-[#6B7280]')}>
                  {duplicateDepartmentCode ? 'This code is already used. Enter a unique letters-only code.' : 'Recommended length: 2 to 8 lowercase letters.'}
                </p>
              </label>

              <div>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Department Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['internal', 'external'] as DepartmentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDepartmentType(type)}
                      className={cn(
                        'rounded-xl border px-4 py-2.5 text-xs font-black capitalize transition-all',
                        departmentType === type ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#E5E7EB] bg-white text-[#4B5563]'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || duplicateDepartmentCode}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRenameModalOpen && selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-[#111827]">Rename Department</h2>
                <p className="text-xs font-bold text-[#6B7280]">Update the department name and code used for employee records.</p>
              </div>
              <button type="button" onClick={() => closeActionModals()} className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={renameDepartment} className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Department Name</span>
                <input
                  value={renameValue}
                  onChange={(event) => updateRenameDepartmentName(event.target.value)}
                  className={cn(
                    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all focus:ring-2',
                    duplicateRename ? 'border-red-300 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#111827]'
                  )}
                />
                {duplicateRename && <p className="mt-2 text-xs font-bold text-red-600">This department name already exists.</p>}
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Department Code</span>
                <input
                  value={renameDepartmentCode}
                  onChange={(event) => {
                    setIsRenameDepartmentCodeEdited(true);
                    setRenameDepartmentCode(sanitizeDepartmentCode(event.target.value));
                  }}
                  placeholder="hc"
                  className={cn(
                    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all focus:ring-2',
                    duplicateRenameDepartmentCode ? 'border-red-300 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#111827]'
                  )}
                />
                <p className={cn('mt-2 text-xs font-bold', duplicateRenameDepartmentCode ? 'text-red-600' : 'text-[#6B7280]')}>
                  {duplicateRenameDepartmentCode ? 'This code is already used. Enter a unique letters-only code.' : 'Recommended length: 2 to 8 lowercase letters.'}
                </p>
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                <button
                  type="button"
                  onClick={() => closeActionModals()}
                  disabled={isActionSaving}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionSaving || duplicateRename || duplicateRenameDepartmentCode}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] disabled:opacity-60"
                >
                  {isActionSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-lg font-black text-[#111827]">Delete Department</h2>
              <p className="mt-1 text-xs font-bold text-[#6B7280]">This action is irreversible and can only delete departments with no assigned employees.</p>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-sm font-bold text-[#4B5563]">
                Permanently delete <span className="text-[#111827]">{selectedDepartment.name}</span>?
              </p>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Confirmation Phrase</span>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => {
                    setDeleteConfirmation(event.target.value);
                    setHasDeleteConfirmationError(event.target.value.length > 0 && event.target.value !== DELETE_CONFIRMATION_PHRASE);
                  }}
                  placeholder={DELETE_CONFIRMATION_PHRASE}
                  className={cn(
                    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all focus:ring-2',
                    hasDeleteConfirmationError ? 'border-red-300 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#111827]'
                  )}
                />
                <p className={cn('mt-2 text-xs font-bold', hasDeleteConfirmationError ? 'text-red-600' : 'text-[#6B7280]')}>
                  {hasDeleteConfirmationError
                    ? `Enter the exact phrase "${DELETE_CONFIRMATION_PHRASE}" to continue.`
                    : `Type "${DELETE_CONFIRMATION_PHRASE}" to enable deletion.`}
                </p>
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-5">
                <button
                  type="button"
                  onClick={() => closeActionModals()}
                  disabled={isActionSaving}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteDepartment}
                  disabled={isActionSaving || !isDeleteConfirmed}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:opacity-60"
                >
                  {isActionSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function DepartmentGroup({
  title,
  departments,
  employeeCounts,
  canManageDepartments,
  openMenuId,
  onToggleMenu,
  onRename,
  onDelete,
  onManageEmployees,
  onExportEmployees,
}: {
  title: string;
  departments: Department[];
  employeeCounts: Record<string, number>;
  canManageDepartments: boolean;
  openMenuId: string | null;
  onToggleMenu: (departmentId: string) => void;
  onRename: (department: Department) => void;
  onDelete: (department: Department) => void;
  onManageEmployees: (department: Department) => void;
  onExportEmployees: (department: Department) => void;
}) {
  if (!departments.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="px-1 text-xs font-black uppercase tracking-widest text-[#6B7280]">{title}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => (
          <div key={department.id} className="group relative rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              {canManageDepartments && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => onToggleMenu(department.id)}
                    aria-label={`Open actions for ${department.name}`}
                    aria-expanded={openMenuId === department.id}
                    className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  {openMenuId === department.id && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-52 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-xl shadow-[#11182714]">
                      <DepartmentAction icon={Edit3} label="Rename" onClick={() => onRename(department)} />
                      <DepartmentAction icon={Users} label="Manage Employees" onClick={() => onManageEmployees(department)} />
                      <DepartmentAction icon={Download} label="Export Employees" onClick={() => onExportEmployees(department)} />
                      <div className="my-1 border-t border-[#F3F4F6]" />
                      <DepartmentAction icon={Trash2} label="Delete" onClick={() => onDelete(department)} destructive />
                    </div>
                  )}
                </div>
              )}
            </div>

            <h3 className="mb-1 text-lg font-bold text-[#111827]">{department.name}</h3>
            <p className="mb-6 flex items-center gap-1.5 text-xs text-[#6B7280]">
              Type: <span className="font-semibold capitalize text-[#111827]">{department.accountType}</span>
            </p>

            <div className="grid grid-cols-2 gap-4 border-t border-[#F3F4F6] pt-4">
              <div>
                <p className="mb-0.5 text-[10px] font-bold uppercase text-[#9CA3AF]">Code</p>
                <p className="text-sm font-bold text-[#111827]">{department.departmentCode || '-'}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-bold uppercase text-[#9CA3AF]">Employees</p>
                <p className="text-sm font-bold text-[#111827]">{employeeCounts[department.name] || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
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
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold transition-all hover:bg-[#F9FAFB]',
        destructive ? 'text-red-600 hover:text-red-700' : 'text-[#4B5563] hover:text-[#111827]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
