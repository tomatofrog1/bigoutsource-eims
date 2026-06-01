import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  Download,
  Loader2,
  Search,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { useAuth } from '@/src/contexts/AuthContext';
import { MOCK_EMPLOYEES, Employee } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { employeeService } from '@/src/services/employeeService';
import { siteService } from '@/src/services/siteService';
import { accountService } from '@/src/services/accountService';
import { employeeImportService } from '@/src/services/employeeImportService';

type SiteOption = {
  id: string;
  name: string;
};

type AccountOption = {
  id: string;
  name: string;
  accountType: 'internal' | 'external';
  lastUsedAt?: string;
};

type EmployeeRecord = Employee & {
  employeeNumber?: string;
  emailPassword?: string;
  siteId?: string;
  rustdeskId?: string;
  isArchived?: boolean;
};

type AddEmployeeForm = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  accountAssignment: string;
  phone: string;
  address: string;
  boEmail: string;
  emailPassword: string;
  lmsAccount: string;
  status: 'active' | 'inactive';
  siteId: string;
  siteName: string;
  pcName: string;
  rustdeskId: string;
  remoteId: string;
  esetStatus: 'active' | 'inactive';
  biosDate: string;
  activityWatchStatus: 'installed' | 'missing';
  windowsKey: string;
  isArchived?: boolean;
};

type DirectoryFieldKey =
  | 'id'
  | 'fullName'
  | 'employeeId'
  | 'employeeNumber'
  | 'accountAssignment'
  | 'phone'
  | 'address'
  | 'boEmail'
  | 'emailPassword'
  | 'lmsAccount'
  | 'status'
  | 'siteId'
  | 'site'
  | 'pcName'
  | 'rustDeskId'
  | 'remoteId'
  | 'esetStatus'
  | 'biosDate'
  | 'activityWatchStatus'
  | 'windowsKey'
  | 'updatedAt'
  | 'updatedBy';

const defaultVisibleFieldKeys: DirectoryFieldKey[] = [
  'fullName',
  'employeeId',
  'accountAssignment',
  'site',
];
const requiredVisibleFieldKeys: DirectoryFieldKey[] = ['fullName'];
const maxVisibleFieldCount = 4;
const recordsPerPage = 10;
const tableRowHeightClass = 'h-16';
const actionColumnWidth = '10rem';

const columnWeights: Partial<Record<DirectoryFieldKey, number>> = {
  fullName: 2.4,
  employeeId: 1,
  employeeNumber: 1,
  accountAssignment: 1.35,
  site: 0.8,
};

const directoryFields: Array<{ key: DirectoryFieldKey; label: string; render: (emp: EmployeeRecord) => ReactNode }> = [
  { key: 'id', label: 'Record ID', render: (emp) => emp.id || '-' },
  { key: 'fullName', label: 'Name', render: (emp) => emp.fullName || 'Unnamed Employee' },
  { key: 'employeeId', label: 'Employee ID', render: (emp) => emp.employeeId || '-' },
  { key: 'employeeNumber', label: 'Employee Number', render: (emp) => emp.employeeNumber || emp.employeeId || '-' },
  { key: 'accountAssignment', label: 'Account', render: (emp) => emp.accountAssignment || '-' },
  { key: 'phone', label: 'Phone Number', render: (emp) => emp.phone || '-' },
  { key: 'address', label: 'Address', render: (emp) => emp.address || '-' },
  { key: 'boEmail', label: 'Bigoutsource Email', render: (emp) => emp.boEmail || '-' },
  { key: 'emailPassword', label: 'Email Password', render: (emp) => emp.emailPassword || '-' },
  { key: 'lmsAccount', label: 'LMS Account', render: (emp) => emp.lmsAccount || '-' },
  {
    key: 'status',
    label: 'Status',
    render: (emp) => (
      <span
        className={cn(
          'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter',
          emp.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
        )}
      >
        {emp.status}
      </span>
    ),
  },
  { key: 'siteId', label: 'Site ID', render: (emp) => emp.siteId || '-' },
  { key: 'site', label: 'Site', render: (emp) => emp.site || 'Unassigned' },
  { key: 'pcName', label: 'PC Name', render: (emp) => emp.pcName || 'Unassigned' },
  { key: 'rustDeskId', label: 'RustDesk ID', render: (emp) => emp.rustDeskId || emp.rustdeskId || '-' },
  { key: 'remoteId', label: 'Remote ID', render: (emp) => emp.remoteId || '-' },
  { key: 'esetStatus', label: 'ESET', render: (emp) => emp.esetStatus || 'Inactive' },
  { key: 'biosDate', label: 'BIOS Date', render: (emp) => emp.biosDate || '-' },
  { key: 'activityWatchStatus', label: 'ActivityWatch', render: (emp) => emp.activityWatchStatus || 'Missing' },
  { key: 'windowsKey', label: 'Windows License Key', render: (emp) => emp.windowsKey || '-' },
  { key: 'updatedAt', label: 'Updated At', render: (emp) => emp.updatedAt || '-' },
  { key: 'updatedBy', label: 'Updated By', render: (emp) => emp.updatedBy || '-' },
];

const initialForm: AddEmployeeForm = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  accountAssignment: '',
  phone: '',
  address: '',
  boEmail: '',
  emailPassword: '',
  lmsAccount: '',
  status: 'active',
  siteId: '',
  siteName: '',
  pcName: '',
  rustdeskId: '',
  remoteId: '',
  esetStatus: 'inactive',
  biosDate: '',
  activityWatchStatus: 'missing',
  windowsKey: '',
  isArchived: false,
};

function titleEsetStatus(value?: string) {
  return value === 'active' || value === 'Active' || value === 'installed' ? 'Active' : 'Inactive';
}

function titleActivityWatchStatus(value?: string) {
  return value === 'installed' || value === 'Installed' ? 'Installed' : 'Missing';
}

function asArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeEmployee(emp: any): EmployeeRecord | null {
  if (!emp) return null;

  return {
    id: emp.id || emp.employeeId || emp.employeeNumber || crypto.randomUUID(),
    employeeId: emp.employeeId || emp.employeeNumber || '',
    employeeNumber: emp.employeeNumber,
    fullName: emp.fullName || '',
    phone: emp.phone || '',
    address: emp.address || '',
    siteId: emp.siteId || '',
    site: emp.site || 'Unassigned',
    status: emp.status || 'active',
    accountAssignment: emp.accountAssignment || '',
    boEmail: emp.boEmail || '',
    emailPassword: emp.emailPassword || '',
    lmsAccount: emp.lmsAccount || '',
    pcName: emp.pcName || '',
    biosDate: emp.biosDate ? String(emp.biosDate).slice(0, 10) : '',
    windowsKey: emp.windowsKey || '',
    rustDeskId: emp.rustDeskId || emp.rustdeskId || '',
    rustdeskId: emp.rustdeskId || emp.rustDeskId || '',
    remoteId: emp.remoteId || '',
    esetStatus: titleEsetStatus(emp.esetStatus || emp.eset) as Employee['esetStatus'],
    activityWatchStatus: titleActivityWatchStatus(emp.activityWatchStatus || emp.activitywatch) as Employee['activityWatchStatus'],
    updatedAt: emp.updatedAt || '',
    updatedBy: emp.updatedBy || '',
    isArchived: emp.isArchived ?? emp.is_archived ?? false,
  };
}

const mockSites: SiteOption[] = [];

function normalizeEmployeeList(value: any) {
  const records = asArray(value).map(normalizeEmployee).filter((emp:any): emp is EmployeeRecord => Boolean(emp));
  return records;
}

function normalizeSiteList(value: any) {
  return asArray(value)
    .filter((site: any) => site?.id && site?.name)
    .map((site: any) => ({ id: site.id, name: site.name }));
}

function normalizeAccount(account: any): AccountOption | null {
  if (!account?.id || !account?.name) return null;

  return {
    id: account.id,
    name: account.name,
    accountType: account.accountType || account.account_type || 'external',
    lastUsedAt: account.lastUsedAt || account.last_used_at || '',
  };
}

function normalizeAccountList(value: any) {
  return asArray(value).map(normalizeAccount).filter((account: any): account is AccountOption => Boolean(account));
}

export default function Directory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageRecords = user?.role !== 'viewer';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [sites, setSites] = useState<SiteOption[]>(mockSites);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [accountFilter, setAccountFilter] = useState('All Account');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFields, setSelectedFields] = useState<DirectoryFieldKey[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStagingImport, setIsStagingImport] = useState(false);
  const [form, setForm] = useState<AddEmployeeForm>(initialForm);

  const loadAccounts = async () => {
    const allResult = await accountService.list().catch(() => null);

    if (allResult) {
      setAccounts(normalizeAccountList(allResult));
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDirectory() {
      setIsLoading(true);

      try {
        const [employeeResult, siteResult] = await Promise.allSettled([
          employeeService.list(),
          siteService.list(),
        ]);

        if (!isMounted) return;

        if (employeeResult.status === 'fulfilled') {
          const records = normalizeEmployeeList(employeeResult.value);
          setEmployees(records);
        } else {
          setEmployees(normalizeEmployeeList(MOCK_EMPLOYEES));
        }

        if (siteResult.status === 'fulfilled') {
          const siteOptions = normalizeSiteList(siteResult.value);
          if (siteOptions.length) setSites(siteOptions);
        }

        await loadAccounts();
      } catch (error) {
        if (isMounted) {
          setEmployees(normalizeEmployeeList(MOCK_EMPLOYEES));
          toast.error('Unable to load records from the database');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDirectory();
    return () => {
      isMounted = false;
    };
  }, []);

  const siteFilterOptions = useMemo(
    () => ['All', ...Array.from(new Set([...sites.map((site) => site.name), ...employees.map((emp) => emp.site)]))],
    [employees, sites]
  );

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const hasSearchTerm = normalizedSearchTerm.length > 0;

  const filteredEmployees = employees
    .filter((emp) => {
      if (hasSearchTerm) {
        return statusFilter === 'Archived' ? emp.isArchived : true;
      }

      return statusFilter === 'Archived' ? emp.isArchived : !emp.isArchived;
    })
    .filter((emp) => {
      const searchableValues = [
        emp.id,
        emp.fullName,
        emp.employeeId,
        emp.employeeNumber,
        emp.accountAssignment,
        emp.phone,
        emp.address,
        emp.boEmail,
        emp.emailPassword,
        emp.lmsAccount,
        emp.status,
        emp.siteId,
        emp.site,
        emp.pcName,
        emp.rustDeskId,
        emp.rustdeskId,
        emp.remoteId,
        emp.esetStatus,
        emp.biosDate,
        emp.activityWatchStatus,
        emp.windowsKey,
        emp.updatedAt,
        emp.updatedBy,
      ];
      const matchesSearch =
        !hasSearchTerm ||
        searchableValues.some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm));

      const matchesSite = siteFilter === 'All' || emp.site === siteFilter;
      const matchesStatus = statusFilter === 'All' || statusFilter === 'Archived' || emp.status === statusFilter.toLowerCase();
      const matchesAccount = accountFilter === 'All Account' || emp.accountAssignment === accountFilter;

      return matchesSearch && matchesSite && matchesStatus && matchesAccount;
    });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / recordsPerPage));
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const paginatedEmployees = filteredEmployees.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const showTableEmptyState = isLoading || filteredEmployees.length === 0;
  const placeholderRowCount = showTableEmptyState ? 0 : Math.max(0, recordsPerPage - paginatedEmployees.length);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, siteFilter, statusFilter, accountFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const updateForm = (field: keyof AddEmployeeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedAccount = accounts.find((account) => account.name === form.accountAssignment);
  const internalAccounts = accounts.filter((account) => account.accountType === 'internal');
  const externalAccounts = accounts.filter((account) => account.accountType === 'external');
  const selectAccount = async (account: AccountOption) => {
    updateForm('accountAssignment', account.name);
    setIsAccountDropdownOpen(false);

    if (!canManageRecords) return;

    const updated = await accountService.touch(account.id).catch(() => null);
    if (updated) {
      const normalized = normalizeAccount(updated);
      if (normalized) {
        setAccounts((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      }
    }
  };

  const visibleFieldKeys = selectedFields ?? defaultVisibleFieldKeys;
  const visibleFields = directoryFields.filter((field) => visibleFieldKeys.includes(field.key));
  const visibleFieldWeightTotal = visibleFields.reduce((total, field) => total + (columnWeights[field.key] || 1), 0);
  const isCustomFieldView = selectedFields !== null;
  const canSelectMoreFields = visibleFieldKeys.length < maxVisibleFieldCount;
  const isFieldVisible = (field: DirectoryFieldKey) => visibleFieldKeys.includes(field);
  const isRequiredField = (field: DirectoryFieldKey) => requiredVisibleFieldKeys.includes(field);

  const toggleField = (field: DirectoryFieldKey) => {
    if (isRequiredField(field)) return;

    setSelectedFields((current) => {
      const nextFields = current ?? defaultVisibleFieldKeys;

      if (nextFields.includes(field)) {
        return nextFields.filter((item) => item !== field);
      }

      if (nextFields.length >= maxVisibleFieldCount) {
        toast.error(`You can display up to ${maxVisibleFieldCount} selected items at a time`);
        return current;
      }

      return [...nextFields, field];
    });
  };

  const resetFields = () => {
    setSelectedFields(null);
  };

  const exportToExcel = () => {
    const rows = filteredEmployees.map((emp) => ({
      ID: emp.employeeId,
      Name: emp.fullName,
      Account: emp.accountAssignment,
      'Phone Number': emp.phone,
      Address: emp.address,
      'Bigoutsource Email': emp.boEmail,
      'Email Password': emp.emailPassword,
      'LMS Account': emp.lmsAccount,
      Status: emp.status,
      Site: emp.site,
      'PC Name': emp.pcName,
      'RustDesk ID': emp.rustDeskId,
      'Remote ID': emp.remoteId,
      ESET: emp.esetStatus,
      'BIOS Date': emp.biosDate,
      ActivityWatch: emp.activityWatchStatus,
      'Windows License Key': emp.windowsKey,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'Nexus_Employees_Export.xlsx');
    toast.success('Excel exported successfully');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;

    setIsStagingImport(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const worksheet = workbook.Sheets['IT Master Tracker'];

      if (!worksheet) {
        throw new Error('The workbook does not contain an IT Master Tracker sheet.');
      }

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:V1');
      range.e.c = Math.min(range.e.c, 21);

      const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        defval: '',
        raw: false,
        range: XLSX.utils.encode_range(range),
      });
      const headers = (matrix[0] || []).map((header) => String(header || '').trim());
      const rows = matrix
        .slice(1)
        .map((values, index) => {
          const rawData = headers.reduce<Record<string, string>>((record, header, headerIndex) => {
            if (header) record[header] = String(values[headerIndex] ?? '').trim();
            return record;
          }, {});

          return {
            sourceRow: index + 2,
            rawData,
          };
        })
        .filter((row) => Object.values(row.rawData).some((value) => value !== ''));

      if (!rows.length) {
        throw new Error('No employee rows were found in IT Master Tracker.');
      }

      const staged = await employeeImportService.stage(rows);
      toast.success(`${staged.summary?.total || rows.length} rows staged for review`);
      navigate(`/employee-imports/${staged.importBatchId}`);
    } catch (error: any) {
      toast.error(error.message || 'Unable to stage import file');
    } finally {
      setIsStagingImport(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setIsAccountDropdownOpen(false);
    setForm(initialForm);
  };

  const handleAddEmployee = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.employeeNumber.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.accountAssignment.trim() || !form.siteId) {
      toast.error('ID, first name, last name, account, and site are required');
      return;
    }

    const selectedSite = sites.find((site) => site.id === form.siteId);
    setIsSaving(true);

    try {
      const created = await employeeService.create({
        employeeNumber: form.employeeNumber.trim() || undefined,
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        accountAssignment: form.accountAssignment.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        boEmail: form.boEmail.trim() || undefined,
        emailPassword: form.emailPassword.trim() || undefined,
        status: form.status,
        siteId: selectedSite && selectedSite.id !== selectedSite.name ? selectedSite.id : undefined,
        siteName: selectedSite?.name,
        pcName: form.pcName.trim() || undefined,
        rustdeskId: form.rustdeskId.trim() || undefined,
        remoteId: form.remoteId.trim() || undefined,
        esetStatus: form.esetStatus,
        biosDate: form.biosDate || undefined,
        activityWatchStatus: form.activityWatchStatus,
        windowsKey: form.windowsKey.trim() || undefined,
      });

      const createdEmployee = normalizeEmployee(created);

      if (!createdEmployee) {
        throw new Error('The server did not return the created employee record.');
      }

      setEmployees((current) => [createdEmployee, ...current]);
      if (selectedAccount) {
        await selectAccount(selectedAccount);
      }
      toast.success('Employee record added');
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Unable to add employee record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout title="Personnel Database" contentClassName="w-full max-w-none">
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden self-start rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xl shadow-[#11182714] xl:block min-h-[80vh]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Table View</p>
              <p className="mt-1 text-xs font-bold text-[#4B5563]">{isCustomFieldView ? `${visibleFieldKeys.length}/4 selected` : 'Default fields shown'}</p>
            </div>
            <button
              type="button"
              onClick={resetFields}
              disabled={!isCustomFieldView}
              className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-[10px] font-black uppercase text-[#6B7280] transition-all hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          <div className="max-h-[78vh] space-y-2 overflow-y-auto pr-1">
            {directoryFields.map((field) => {
              const checked = isFieldVisible(field.key);
              const required = isRequiredField(field.key);
              const disabled = required || (!checked && !canSelectMoreFields);

              return (
                <label
                  key={field.key}
                  className={cn(
                    'flex items-start gap-2 rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-bold text-[#374151] transition-all',
                    checked ? 'bg-[#F9FAFB]' : 'bg-white',
                    disabled && !required ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#D1D5DB]',
                    required && 'cursor-not-allowed'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleField(field.key)}
                    className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] accent-[#111827]"
                  />
                  <span className="leading-snug">{field.label}</span>
                </label>
              );
            })}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, ID, PC, or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#111827]"
              >
                {siteFilterOptions.map((site) => (
                  <option key={site} value={site}>
                    {site === 'All' ? 'All Sites' : site}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#111827]"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#111827]"
              >
                <option value="All Account">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageRecords && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => void handleImportFile(event.target.files?.[0])}
                />
                <button
                  onClick={handleImport}
                  disabled={isStagingImport}
                  className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                >
                  {isStagingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isStagingImport ? 'Staging' : 'Import'}
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#111827] text-white rounded-xl text-sm font-black hover:bg-[#374151] transition-all shadow-lg shadow-[#11182720]"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Record
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
            <colgroup>
              {visibleFields.map((field) => (
                <col key={field.key} style={{ width: `${((columnWeights[field.key] || 1) / visibleFieldWeightTotal) * 100}%` }} />
              ))}
              <col style={{ width: actionColumnWidth }} />
            </colgroup>
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {visibleFields.map((field) => (
                  <th
                    key={field.key}
                    className={cn(
                      'h-14 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle',
                      field.key === 'fullName' ? 'pl-4 pr-3' : 'pl-6 pr-3'
                    )}
                  >
                    <div className="truncate">{field.label}</div>
                  </th>
                ))}
                <th className="h-14 px-4 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {paginatedEmployees.map((emp) => (
                <tr key={emp.id} className={cn(tableRowHeightClass, 'hover:bg-[#F9FAFB] transition-colors group')}>
                  {visibleFields.map((field) => (
                    <td
                      key={field.key}
                      className={cn(
                        'py-0 align-middle text-sm font-bold text-[#111827]',
                        field.key === 'fullName' ? 'pl-4 pr-3' : 'pl-6 pr-3'
                      )}
                    >
                      <div className="truncate">{field.render(emp)}</div>
                    </td>
                  ))}
                  <td className="px-4 py-0 text-right align-middle">
                    <Link
                      to={`/employee/${emp.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-xl p-2 text-xs font-bold text-[#9CA3AF] transition-all hover:bg-white hover:text-[#111827]"
                    >
                      <span className="truncate">View Profile</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {Array.from({ length: placeholderRowCount }).map((_, index) => (
                <tr key={`placeholder-${index}`} className={cn(tableRowHeightClass, 'pointer-events-none')}>
                  <td colSpan={visibleFields.length + 1} className="px-4 py-0 align-middle" />
                </tr>
              ))}
              {showTableEmptyState && (
                <tr className="h-[40rem]">
                  <td colSpan={visibleFields.length + 1} className="px-4 py-0 text-center align-middle">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6]">
                        {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" /> : <Search className="h-8 w-8 text-[#D1D5DB]" />}
                      </div>
                      <h3 className="text-lg font-bold text-[#111827]">{isLoading ? 'Loading records' : 'No records found'}</h3>
                      <p className="text-sm text-[#6B7280]">{isLoading ? 'Fetching personnel data from the database.' : 'Try adjusting your filters or search keywords.'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
                Total Personnel: {filteredEmployees.length}
              </p>
              <p className="mt-1 text-xs font-black text-[#111827]">
                Page {currentPage} of {totalPages}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!hasPreviousPage}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className={cn(
                  'px-4 py-1.5 border border-[#E5E7EB] rounded-xl text-xs font-bold transition-all',
                  hasPreviousPage
                    ? 'bg-white text-[#111827] hover:bg-[#F3F4F6]'
                    : 'text-[#9CA3AF] cursor-not-allowed'
                )}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNextPage}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className={cn(
                  'px-4 py-1.5 border border-[#E5E7EB] rounded-xl text-xs font-bold transition-all',
                  hasNextPage
                    ? 'bg-white text-[#111827] hover:bg-[#F3F4F6]'
                    : 'text-[#9CA3AF] cursor-not-allowed'
                )}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-[#111827]">Add Employee Record</h2>
                <p className="text-xs font-bold text-[#6B7280]">First name, last name, account, and site are required. LMS account is generated automatically.</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827] transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="overflow-y-auto max-h-[calc(92vh-81px)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                <Field label="ID" required>
                  <Input value={form.employeeNumber} onChange={(value) => updateForm('employeeNumber', value)} placeholder="BOSS00045" />
                </Field>
                <Field label="First Name" required>
                  <Input value={form.firstName} onChange={(value) => updateForm('firstName', value)} placeholder="First name" />
                </Field>
                <Field label="Last Name" required>
                  <Input value={form.lastName} onChange={(value) => updateForm('lastName', value)} placeholder="Last name" />
                </Field>
                <Field label="Account" required>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAccountDropdownOpen((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#D1D5DB] focus:ring-2 focus:ring-[#111827]"
                    >
                      <span className="truncate">{form.accountAssignment || 'Select account type'}</span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isAccountDropdownOpen && 'rotate-90')} />
                    </button>
                    {isAccountDropdownOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
                        {accounts.length ? (
                          <div className="max-h-64 overflow-y-auto">
                            <AccountDropdownGroup title="Internal" accounts={internalAccounts} onSelect={selectAccount} />
                            <AccountDropdownGroup title="External" accounts={externalAccounts} onSelect={selectAccount} />
                          </div>
                        ) : (
                          <div className="px-3 py-3 text-xs font-bold text-[#6B7280]">No departments yet</div>
                        )}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Phone Number">
                  <Input value={form.phone} onChange={(value) => updateForm('phone', value)} placeholder="Phone number" />
                </Field>
                <Field label="Bigoutsource Email">
                  <Input type="email" value={form.boEmail} onChange={(value) => updateForm('boEmail', value)} placeholder="name@bigoutsource.com" />
                </Field>
                <Field label="Email Password">
                  <Input value={form.emailPassword} onChange={(value) => updateForm('emailPassword', value)} placeholder="Email password" />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(value) => updateForm('status', value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </Field>
                <Field label="Site" required>
                  <Select value={form.siteId} onChange={(value) => updateForm('siteId', value)}>
                    <option value="">Select site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="PC Name">
                  <Input value={form.pcName} onChange={(value) => updateForm('pcName', value)} placeholder="PC name" />
                </Field>
                <Field label="RustDesk ID">
                  <Input value={form.rustdeskId} onChange={(value) => updateForm('rustdeskId', value)} placeholder="RustDesk ID" />
                </Field>
                <Field label="Remote ID">
                  <Input value={form.remoteId} onChange={(value) => updateForm('remoteId', value)} placeholder="Remote ID" />
                </Field>
                <Field label="ESET">
                  <Select value={form.esetStatus} onChange={(value) => updateForm('esetStatus', value)}>
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                  </Select>
                </Field>
                <Field label="BIOS Date">
                  <Input type="date" value={form.biosDate} onChange={(value) => updateForm('biosDate', value)} />
                </Field>
                <Field label="ActivityWatch">
                  <Select value={form.activityWatchStatus} onChange={(value) => updateForm('activityWatchStatus', value)}>
                    <option value="missing">Missing</option>
                    <option value="installed">Installed</option>
                  </Select>
                </Field>
                <Field label="Windows License Key">
                  <Input value={form.windowsKey} onChange={(value) => updateForm('windowsKey', value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Address">
                    <Input value={form.address} onChange={(value) => updateForm('address', value)} placeholder="Employee address" />
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#111827] text-white rounded-xl text-sm font-black hover:bg-[#374151] disabled:opacity-60 transition-all shadow-lg shadow-[#11182720]"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </PageLayout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function AccountDropdownGroup({
  title,
  accounts,
  onSelect,
}: {
  title: string;
  accounts: AccountOption[];
  onSelect: (account: AccountOption) => void;
}) {
  if (!accounts.length) return null;

  return (
    <div className="border-b border-[#F3F4F6] last:border-b-0">
      <div className="sticky top-0 bg-[#F9FAFB] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
        {title}
      </div>
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          onClick={() => onSelect(account)}
          className="flex w-full items-center justify-between gap-3 border-t border-[#F3F4F6] px-3 py-2.5 text-left text-sm font-bold text-[#111827] transition-all hover:bg-[#F9FAFB]"
        >
          <span className="truncate">{account.name}</span>
        </button>
      ))}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#111827] transition-all"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#111827]"
    >
      {children}
    </select>
  );
}
