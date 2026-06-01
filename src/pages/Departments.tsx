import { useEffect, useMemo, useState } from 'react';
import { Building2, Download, Edit3, Loader2, MoreVertical, Plus, Search, Trash2, UsersRound, X } from 'lucide-react';
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
  account?: string;
  site?: string;
  status?: string;
  boEmail?: string;
  phone?: string;
  pcName?: string;
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
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [isDepartmentCodeEdited, setIsDepartmentCodeEdited] = useState(false);
  const [departmentType, setDepartmentType] = useState<DepartmentType>('internal');
  const [isSaving, setIsSaving] = useState(false);

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

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingDepartment(null);
    setDepartmentName('');
    setDepartmentType('internal');
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    setDepartmentName('');
    setDepartmentCode('');
    setIsDepartmentCodeEdited(false);
    setDepartmentType('internal');
    setIsModalOpen(true);
  };

  const openRenameModal = (department: Department) => {
    setOpenMenuId(null);
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setDepartmentType(department.accountType);
    setIsModalOpen(true);
  };

  const saveDepartment = async (event: React.FormEvent) => {
  const updateDepartmentName = (value: string) => {
    setDepartmentName(value);
    if (!isDepartmentCodeEdited) setDepartmentCode(suggestDepartmentCode(value));
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
      if (editingDepartment) {
        const previousName = editingDepartment.name;
        const updated = await accountService.update(editingDepartment.id, {
          name: departmentName.trim(),
          accountType: departmentType,
        });
        const department = normalizeDepartment(updated);
        if (!department) throw new Error('The server did not return the updated department.');

        setDepartments((current) => current.map((item) => (item.id === department.id ? department : item)));
        setEmployees((current) =>
          current.map((employee) => {
            const account = employee.accountAssignment || employee.account || '';
            return account === previousName ? { ...employee, accountAssignment: department.name, account: department.name } : employee;
          })
        );
        setEmployeeCounts((current) => {
          const count = current[previousName] || 0;
          const next = { ...current };
          delete next[previousName];
          next[department.name] = count;
          return next;
        });
        toast.success('Department renamed');
        closeModal();
        return;
      }

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

  const deleteDepartment = async (department: Department) => {
    setOpenMenuId(null);
    const count = employeeCounts[department.name] || 0;
    const confirmed = window.confirm(
      count > 0
        ? `Delete "${department.name}"? This removes it from department choices, but the ${count} assigned employee record${count === 1 ? '' : 's'} will stay unchanged.`
        : `Delete "${department.name}"?`
    );
    if (!confirmed) return;

    try {
      await accountService.remove(department.id);
      setDepartments((current) => current.filter((item) => item.id !== department.id));
      toast.success('Department deleted');
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete department');
    }
  };

  const employeesForDepartment = (department: Department) =>
    employees.filter((employee) => (employee.accountAssignment || employee.account || '') === department.name);

  const manageEmployees = (department: Department) => {
    setOpenMenuId(null);
    navigate(`/directory?account=${encodeURIComponent(department.name)}`);
  };

  const exportEmployees = (department: Department) => {
    setOpenMenuId(null);
    const rows = employeesForDepartment(department).map((employee) => ({
      ID: employee.employeeNumber || employee.employeeId || employee.id || '',
      Name: employee.fullName || '',
      Account: employee.accountAssignment || employee.account || '',
      Site: employee.site || '',
      Status: employee.status || '',
      Email: employee.boEmail || '',
      Phone: employee.phone || '',
      'PC Name': employee.pcName || '',
    }));

    if (!rows.length) {
      toast.error('No employees to export for this department');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `${department.name.replace(/[\\/:*?"<>|]/g, '-')}_Employees.xlsx`);
    toast.success('Department employees exported');
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
              onClick={openCreateModal}
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
            onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
            onRename={openRenameModal}
            onDelete={deleteDepartment}
            onManageEmployees={manageEmployees}
            onExportEmployees={exportEmployees}
          />
          <DepartmentGroup
            title="External"
            departments={externalDepartments}
            employeeCounts={employeeCounts}
            canManageDepartments={canManageDepartments}
            openMenuId={openMenuId}
            onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
            onRename={openRenameModal}
            onDelete={deleteDepartment}
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
                <h2 className="text-lg font-black text-[#111827]">{editingDepartment ? 'Rename Department' : 'New Department'}</h2>
                <p className="text-xs font-bold text-[#6B7280]">
                  {editingDepartment ? 'Renaming also updates assigned employee records.' : 'Departments added here become account choices in Employee Records.'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveDepartment} className="space-y-5 p-6">
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
                  {editingDepartment ? 'Save Changes' : 'Add Department'}
                </button>
              </div>
            </form>
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
  onToggleMenu: (id: string) => void;
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
          <div key={department.id} className="group rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onToggleMenu(department.id)}
                  className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]"
                  aria-label={`Open actions for ${department.name}`}
                  aria-expanded={openMenuId === department.id}
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {openMenuId === department.id && (
                  <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-xl shadow-[#1118271F]">
                    <MenuButton icon={UsersRound} label="Manage Employees" onClick={() => onManageEmployees(department)} />
                    <MenuButton icon={Download} label="Export Employees" onClick={() => onExportEmployees(department)} />
                    {canManageDepartments && (
                      <>
                        <div className="my-1 border-t border-[#F3F4F6]" />
                        <MenuButton icon={Edit3} label="Rename" onClick={() => onRename(department)} />
                        <MenuButton icon={Trash2} label="Delete" onClick={() => onDelete(department)} tone="danger" />
                      </>
                    )}
                  </div>
                )}
              </div>
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

function MenuButton({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs font-black transition-colors',
        tone === 'danger' ? 'text-[#B91C1C] hover:bg-[#FEF2F2]' : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827]'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
