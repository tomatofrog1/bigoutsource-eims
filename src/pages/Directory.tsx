import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clipboard,
  Download,
  Loader2,
  Search,
  Save,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { Pagination } from '@/src/components/Pagination';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { useAuth } from '@/src/contexts/AuthContext';
import { MOCK_EMPLOYEES, Employee } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { generateLmsAccount } from '@/src/lib/lmsAccount';
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
  departmentCode: string;
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
  middleName: string;
  lastName: string;
  suffix?: string;
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

type FormErrors = Partial<Record<keyof AddEmployeeForm, string>>;

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

type SortDirection = 'asc' | 'desc';

type SortConfig = {
  key: DirectoryFieldKey;
  direction: SortDirection;
};

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
  { key: 'emailPassword', label: 'Password', render: (emp) => emp.emailPassword || '-' },
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

const sortableFieldKeys: DirectoryFieldKey[] = directoryFields.map((field) => field.key);

const initialForm: AddEmployeeForm = {
  employeeNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
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

const wizardSteps = [
  { title: 'Employee Info' },
  { title: 'Accounts' },
  { title: 'Assignment' },
  { title: 'IT Assets' },
  { title: 'Review' },
];

const draftStorageKey = 'employee-onboarding-draft';

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
    fullName: String(emp.fullName || '').replace(/\u00A0/g, ' '),
    phone: emp.phone || '',
    address: emp.address || '',
    siteId: emp.siteId || '',
    site: emp.site || 'Unassigned',
    status: emp.status || 'active',
    accountAssignment: emp.accountAssignment || '',
    boEmail: emp.boEmail || '',
    emailPassword: emp.emailPassword || '',
    lmsAccount: generateLmsAccount(emp.fullName || '') || emp.lmsAccount || '',
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
  const records = asArray(value).map(normalizeEmployee).filter((emp: any): emp is EmployeeRecord => Boolean(emp));
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
    departmentCode: account.departmentCode || account.department_code || '',
    lastUsedAt: account.lastUsedAt || account.last_used_at || '',
  };
}

function sanitizeNamePart(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function capitalizeNameInput(value = '') {
  return value
    .split(' ')
    .map((part) => {
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function hasDraftData(form: AddEmployeeForm) {
  return Object.entries(form).some(([key, value]) => {
    if (key === 'status') return value !== initialForm.status;
    if (key === 'esetStatus') return value !== initialForm.esetStatus;
    if (key === 'activityWatchStatus') return value !== initialForm.activityWatchStatus;
    if (key === 'isArchived') return Boolean(value) !== Boolean(initialForm.isArchived);
    return String(value || '').trim().length > 0;
  });
}

function formatDraftTimestamp(value?: string | null) {
  if (!value) return '';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function suggestDepartmentCode(name = '') {
  return name
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, '').charAt(0).toLowerCase())
    .join('');
}

function generatedPreview(form: AddEmployeeForm, account?: AccountOption) {
  const firstRaw = String(form.firstName || '');
  const firstForLms = sanitizeNamePart(firstRaw);
  
  const firstInitials = firstRaw
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => sanitizeNamePart(part).charAt(0))
    .join('');

  const last = sanitizeNamePart(form.lastName);
  const code = account?.departmentCode || suggestDepartmentCode(account?.name || '');
  const identifier = `${firstInitials}${last}`;
  const domain = account?.accountType === 'internal' ? 'com' : ['hc', 'utd'].includes(code) ? 'team' : 'ph';

  return {
    lmsAccount: firstForLms && last ? `${firstForLms}.${last}` : '',
    boEmail: identifier && code ? `${identifier}.${code}@bigoutsource.${domain}` : '',
    pcName: identifier && code ? `${code}-${identifier}` : '',
  };
}

function normalizeAccountList(value: any) {
  return asArray(value).map(normalizeAccount).filter((account: any): account is AccountOption => Boolean(account));
}

function sortValue(emp: EmployeeRecord, key: DirectoryFieldKey) {
  if (key === 'employeeId') return emp.employeeId || emp.employeeNumber || '';
  return String(emp[key as keyof EmployeeRecord] || '');
}

function compareEmployees(a: EmployeeRecord, b: EmployeeRecord, sortConfig: SortConfig) {
  const direction = sortConfig.direction === 'asc' ? 1 : -1;
  const first = sortValue(a, sortConfig.key).trim();
  const second = sortValue(b, sortConfig.key).trim();

  if (!first && second) return 1;
  if (first && !second) return -1;

  return first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }) * direction;
}

export default function Directory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canManageRecords = user?.role !== 'viewer';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [sites, setSites] = useState<SiteOption[]>(mockSites);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [accountFilter, setAccountFilter] = useState(() => searchParams.get('account') || 'All Account');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFields, setSelectedFields] = useState<DirectoryFieldKey[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStagingImport, setIsStagingImport] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [form, setForm] = useState<AddEmployeeForm>(initialForm);
  const [activeStep, setActiveStep] = useState(0);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

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

  const sortedEmployees = useMemo(() => {
    const targetSort: SortConfig = sortConfig || { key: 'fullName', direction: 'asc' };
    return [...filteredEmployees].sort((a, b) => compareEmployees(a, b, targetSort));
  }, [filteredEmployees, sortConfig]);
  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / recordsPerPage));
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const paginatedEmployees = sortedEmployees.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const showTableEmptyState = isLoading || sortedEmployees.length === 0;
  const placeholderRowCount = showTableEmptyState ? 0 : Math.max(0, recordsPerPage - paginatedEmployees.length);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, siteFilter, statusFilter, accountFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const updateForm = (field: keyof AddEmployeeForm, value: string) => {
    if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
      if (/[^a-zA-Z\-\'\s]/.test(value)) {
        return;
      }
    }

    const formattedValue =
      field === 'employeeNumber'
        ? value.toUpperCase()
        : field === 'firstName' || field === 'middleName' || field === 'lastName'
          ? capitalizeNameInput(value)
          : value;

    setForm((current) => ({ ...current, [field]: formattedValue }));
    setIsReviewConfirmed(false);
    setFormErrors((current) => {
      if (!current[field]) return current;
      const { [field]: _removed, ...nextErrors } = current;
      return nextErrors;
    });
  };

  useEffect(() => {
    const rawDraft = localStorage.getItem(draftStorageKey);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as { form?: AddEmployeeForm; savedAt?: string };
      if (!draft.form) return;
      setForm({ ...initialForm, ...draft.form });
      setDraftSavedAt(draft.savedAt || null);
      setIsDraftRestored(true);
    } catch {
      localStorage.removeItem(draftStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const rawDraft = localStorage.getItem(draftStorageKey);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as { form?: AddEmployeeForm; savedAt?: string };
      if (!draft.form) return;
      setForm({ ...initialForm, ...draft.form });
      setDraftSavedAt(draft.savedAt || null);
      setIsDraftRestored(true);
    } catch {
      localStorage.removeItem(draftStorageKey);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen || !hasDraftData(form)) return;

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftStorageKey, JSON.stringify({ form, savedAt }));
      setDraftSavedAt(savedAt);
      setIsDraftRestored(false);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [form, isModalOpen]);

  const selectedAccount = accounts.find((account) => account.name === form.accountAssignment);
  const preview = generatedPreview(form, selectedAccount);
  const selectedAccountMissingCode = Boolean(selectedAccount && !selectedAccount.departmentCode);
  const draftSavedLabel = draftSavedAt ? `Last saved ${formatDraftTimestamp(draftSavedAt)}` : 'Not saved yet';
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

  const toggleSort = (field: DirectoryFieldKey) => {
    if (!sortableFieldKeys.includes(field)) return;

    setSortConfig((current) => {
      if (current?.key !== field) {
        return { key: field, direction: 'asc' };
      }

      if (current.direction === 'asc') {
        return { key: field, direction: 'desc' };
      }

      return null;
    });
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;

    setIsStagingImport(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const worksheet = workbook.Sheets['Employee Records'];

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
    if (hasDraftData(form)) {
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftStorageKey, JSON.stringify({ form, savedAt }));
      setDraftSavedAt(savedAt);
    }
    setIsModalOpen(false);
    setIsAccountDropdownOpen(false);
    setForm(initialForm);
    setActiveStep(0);
    setFormErrors({});
    setIsReviewConfirmed(false);
  };

  const validationForStep = (step: number, requireAll = false): FormErrors => {
    const errors: FormErrors = {};

    if ((requireAll || step === 0) && !form.employeeNumber.trim()) {
      errors.employeeNumber = 'Employee ID is required for HR and payroll matching.';
    }
    if ((requireAll || step === 0) && !form.firstName.trim()) {
      errors.firstName = 'Enter the employee first name.';
    }
    if ((requireAll || step === 0) && !form.lastName.trim()) {
      errors.lastName = 'Enter the employee last name.';
    }
    if ((requireAll || step === 0) && form.phone && !/^\d+$/.test(form.phone)) {
      errors.phone = 'Please enter numbers only.';
    }
    if ((requireAll || step === 1) && !form.accountAssignment.trim()) {
      errors.accountAssignment = 'Select an account or department before generating access.';
    }
    if ((requireAll || step === 2) && !form.siteId) {
      errors.siteId = 'Select the employee work site.';
    }

    return errors;
  };

  const goToNextStep = () => {
    const errors = validationForStep(activeStep);

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error('Please resolve the highlighted fields before continuing');
      return;
    }

    setFormErrors({});
    setActiveStep((step) => Math.min(step + 1, wizardSteps.length - 1));
  };

  const goToPreviousStep = () => {
    setFormErrors({});
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const saveDraft = () => {
    const savedAt = new Date().toISOString();
    localStorage.setItem(draftStorageKey, JSON.stringify({ form, savedAt }));
    setDraftSavedAt(savedAt);
    setIsDraftRestored(false);
    toast.success('Draft saved locally');
  };

  const clearDraft = () => {
    if (!draftSavedAt) return;

    const confirmed = window.confirm('Clear the saved employee onboarding draft? This cannot be undone.');
    if (!confirmed) return;

    localStorage.removeItem(draftStorageKey);
    setDraftSavedAt(null);
    setIsDraftRestored(false);
    setForm(initialForm);
    setActiveStep(0);
    setFormErrors({});
    setIsReviewConfirmed(false);
    toast.success('Draft cleared');
  };

  const handleAddEmployee = async (event: FormEvent) => {
    event.preventDefault();

    const errors = validationForStep(activeStep, true);

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      const firstErrorField = Object.keys(errors)[0] as keyof AddEmployeeForm;
      const errorStep = firstErrorField === 'accountAssignment' ? 1 : firstErrorField === 'siteId' ? 2 : 0;
      setActiveStep(errorStep);
      toast.error('Please resolve the highlighted fields before submitting');
      return;
    }

    if (!isReviewConfirmed) {
      setActiveStep(4);
      toast.error('Confirm the reviewed onboarding details before submitting');
      return;
    }

    const selectedSite = sites.find((site) => site.id === form.siteId);
    setIsSaving(true);

    try {
      const created = await employeeService.create({
        employeeNumber: form.employeeNumber.trim() || undefined,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        suffix: form.suffix?.trim() || undefined,
        fullName: [
          form.firstName.trim().replace(/ /g, '\u00A0'),
          form.middleName.trim().replace(/ /g, '\u00A0'),
          form.lastName.trim().replace(/ /g, '\u00A0'),
          form.suffix?.trim()
        ].filter(Boolean).join(' '),
        accountAssignment: form.accountAssignment.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        emailPassword: form.emailPassword.trim() || undefined,
        status: form.status,
        siteId: selectedSite && selectedSite.id !== selectedSite.name ? selectedSite.id : undefined,
        siteName: selectedSite?.name,
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
      localStorage.removeItem(draftStorageKey);
      setDraftSavedAt(null);
      setIsDraftRestored(false);
      toast.success('Employee record added');
      setIsModalOpen(false);
      setIsAccountDropdownOpen(false);
      setForm(initialForm);
      setActiveStep(0);
      setFormErrors({});
      setIsReviewConfirmed(false);
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
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
              <div className="flex items-center gap-1.5">
                <FilterDropdown
                  value={siteFilter}
                  onChange={setSiteFilter}
                  options={siteFilterOptions.map((site) => ({ value: site, label: site === 'All' ? 'All Sites' : site }))}
                />
                <FilterDropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'All', label: 'All Status' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                    { value: 'Archived', label: 'Archived' },
                  ]}
                />
                <AccountFilterDropdown
                  value={accountFilter}
                  onChange={setAccountFilter}
                  internalAccounts={internalAccounts}
                  externalAccounts={externalAccounts}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
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
                    className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                  >
                    {isStagingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isStagingImport ? 'Staging' : 'Import'}
                  </button>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 bg-[#111827] text-white rounded-xl text-sm font-black hover:bg-[#374151] transition-all shadow-lg shadow-[#11182720]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Record
                  </button>
                </>
              )}
            </div>
          </div>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto relative">
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
                      <th key={field.key} className={cn('h-14 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle', field.key === 'fullName' ? 'pl-4 pr-3' : 'pl-6 pr-3')}>
                        <div className="truncate">{field.label}</div>
                      </th>
                    ))}
                    <th className="h-14 px-4 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {[...Array(recordsPerPage)].map((_, index) => (
                    <tr key={`skeleton-${index}`} className={cn(tableRowHeightClass, 'animate-pulse border-b border-[#F3F4F6] last:border-0')}>
                      {visibleFields.map((field) => (
                        <td key={field.key} className={cn('py-0 align-middle', field.key === 'fullName' ? 'pl-4 pr-3' : 'pl-6 pr-3')}>
                          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                        </td>
                      ))}
                      <td className="px-4 py-0 text-right align-middle">
                        <div className="h-9 w-24 bg-gray-200 rounded-xl ml-auto"></div>
                      </td>
                    </tr>
                  ))}
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
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
              <SkeletonLoadingMessage message="Fetching personnel records..." />
            </motion.div>
          ) : (
            <motion.div key="content-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
                <colgroup>
                  {visibleFields.map((field) => (
                    <col key={field.key} style={{ width: `${((columnWeights[field.key] || 1) / visibleFieldWeightTotal) * 100}%` }} />
                  ))}
                  <col style={{ width: actionColumnWidth }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {visibleFields.map((field) => {
                      const isSortable = sortableFieldKeys.includes(field.key);
                      const isActiveSort = sortConfig?.key === field.key;
                      const SortIcon = isActiveSort ? (sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                      return (
                        <th
                          key={field.key}
                          className={cn(
                            'h-14 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle',
                            field.key === 'fullName' ? 'pl-4 pr-3' : 'pl-6 pr-3'
                          )}
                        >
                          {isSortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(field.key)}
                              aria-sort={isActiveSort ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                              className={cn(
                                'flex max-w-full items-center gap-1.5 rounded-lg py-2 text-left uppercase tracking-widest transition-colors hover:text-[#111827]',
                                isActiveSort && 'text-[#111827]'
                              )}
                            >
                              <span className="truncate">{field.label}</span>
                              <SortIcon className={cn('h-3.5 w-3.5 shrink-0', isActiveSort ? 'text-[#111827]' : 'text-[#9CA3AF]')} />
                            </button>
                          ) : (
                            <div className="truncate">{field.label}</div>
                          )}
                        </th>
                      );
                    })}
                    <th className="h-14 px-4 py-0 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest align-middle"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {paginatedEmployees.map((emp, index) => (
                    <motion.tr 
                      key={emp.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
                      className={cn(tableRowHeightClass, 'hover:bg-[#F9FAFB] transition-colors group border-b border-[#F3F4F6] last:border-0')}
                    >
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
                  </motion.tr>
                ))}
                {Array.from({ length: placeholderRowCount }).map((_, index) => (
                  <tr key={`placeholder-${index}`} className={cn(tableRowHeightClass, 'pointer-events-none border-b border-[#F3F4F6] last:border-0')}>
                    <td colSpan={visibleFields.length + 1} className="px-4 py-0 align-middle" />
                  </tr>
                ))}
                {showTableEmptyState && (
                  <tr className="h-[40rem]">
                    <td colSpan={visibleFields.length + 1} className="px-4 py-0 text-center align-middle">
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6]">
                          <Search className="h-8 w-8 text-[#D1D5DB]" />
                        </div>
                        <h3 className="text-lg font-bold text-[#111827]">No records found</h3>
                        <p className="text-sm text-[#6B7280]">Try adjusting your filters or search keywords.</p>
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
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="flex h-[800px] max-h-[94vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-[#D1D5DB] bg-[#F9FAFB] shadow-2xl shadow-[#11182733]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">Onboarding Workflow</p>
                <h2 className="mt-1 text-xl font-black text-[#111827]">Add Employee Record</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-[#E5E7EB] bg-white px-6 py-4">
                <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-3 md:grid-cols-5">
                  {wizardSteps.map((step, index) => {
                    const isCurrent = index === activeStep;
                    const isComplete = index < activeStep;
                    const StepIcon = isComplete ? CheckCircle2 : Circle;

                    return (
                      <button
                        key={step.title}
                        type="button"
                        onClick={() => {
                          if (index <= activeStep) setActiveStep(index);
                        }}
                        disabled={index > activeStep}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                          isCurrent
                            ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#2563EB]/10 shadow-sm'
                            : isComplete
                              ? 'border-[#BBF7D0] dark:border-[#16A34A]/30 bg-[#F0FDF4] dark:bg-[#16A34A]/10'
                              : 'border-[#E5E7EB] bg-white',
                          index > activeStep ? 'cursor-not-allowed opacity-70' : 'hover:border-[#CBD5E1]'
                        )}
                      >
                        <StepIcon className={cn('h-5 w-5 shrink-0', isCurrent ? 'text-[#2563EB]' : isComplete ? 'text-[#16A34A]' : 'text-[#CBD5E1]')} />
                        <span className="min-w-0">
                          <span className={cn('block text-[10px] font-black uppercase tracking-widest', isCurrent ? 'text-[#2563EB]' : 'text-[#6B7280]')}>
                            Step {index + 1}
                          </span>
                          <span className="block truncate text-sm font-black text-[#111827]">{step.title}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto min-h-[540px] w-full max-w-[1000px] transition-opacity duration-200">
                  {activeStep === 0 && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <SectionCard title="Employee Information" eyebrow="Manual">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col md:flex-row md:justify-between gap-4 md:gap-0">
                            <div className="md:w-[48%]">
                              <Field label="Employee ID" required error={formErrors.employeeNumber}>
                                <Input value={form.employeeNumber} onChange={(value) => updateForm('employeeNumber', value)} placeholder="e.g. BOSS00045" error={Boolean(formErrors.employeeNumber)} />
                              </Field>
                            </div>
                            <div className="md:w-[48%]">
                              <Field label="First Name" required error={formErrors.firstName}>
                                <Input value={form.firstName} onChange={(value) => updateForm('firstName', value)} placeholder="e.g. John" error={Boolean(formErrors.firstName)} />
                              </Field>
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row md:justify-between gap-4 md:gap-0">
                            <div className="md:w-[38%] mt-[1px]">
                              <Field label="Middle Name" error={formErrors.middleName}>
                                <Input value={form.middleName} onChange={(value) => updateForm('middleName', value)} placeholder="e.g. Robert" error={Boolean(formErrors.middleName)} />
                              </Field>
                            </div>
                            <div className="md:w-[38%]">
                              <Field label="Last Name" required error={formErrors.lastName}>
                                <Input value={form.lastName} onChange={(value) => updateForm('lastName', value)} placeholder="e.g. Doe" error={Boolean(formErrors.lastName)} />
                              </Field>
                            </div>
                            <div className="md:w-[18%] mt-[1px]">
                              <Field label="Suffix">
                                <Input value={form.suffix || ''} onChange={(value) => updateForm('suffix', value)} placeholder="e.g. Jr." />
                              </Field>
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Contact Details" eyebrow="Optional">
                        <div className="grid grid-cols-1 gap-4">
                          <Field label="Phone Number" error={formErrors.phone}>
                            <Input 
                              value={form.phone} 
                              onChange={(value) => {
                                if (!/^\d*$/.test(value)) {
                                  setFormErrors((current) => ({ ...current, phone: 'Please enter numbers only.' }));
                                  setForm((current) => ({ ...current, phone: value.replace(/\D/g, '') }));
                                } else {
                                  updateForm('phone', value);
                                }
                              }} 
                              placeholder="e.g. 09123456789" 
                              error={Boolean(formErrors.phone)} 
                            />
                          </Field>
                          <Field label="Address">
                            <Input value={form.address} onChange={(value) => updateForm('address', value)} placeholder="e.g. 123 Main St, City" />
                          </Field>
                        </div>
                      </SectionCard>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <SectionCard title="Accounts" eyebrow="Manual">
                        <div className="grid grid-cols-1 gap-4">
                          <Field label="Account / Department" required error={formErrors.accountAssignment}>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsAccountDropdownOpen((current) => !current)}
                                className={cn(
                                  'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]',
                                  formErrors.accountAssignment ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' : 'border-[#D1D5DB]'
                                )}
                              >
                                <span className="truncate">{form.accountAssignment || 'Select account type'}</span>
                                <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isAccountDropdownOpen && 'rotate-90')} />
                              </button>
                              <AnimatePresence>
{isAccountDropdownOpen && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
                                  {accounts.length ? (
                                    <div className="max-h-64 overflow-y-auto">
                                      <AccountDropdownGroup title="Internal" accounts={internalAccounts} onSelect={selectAccount} />
                                      <AccountDropdownGroup title="External" accounts={externalAccounts} onSelect={selectAccount} />
                                    </div>
                                  ) : (
                                    <div className="px-3 py-3 text-xs font-bold text-[#6B7280]">No departments yet</div>
                                  )}
                                </motion.div>
                              )}
                              </AnimatePresence>
                            </div>
                          </Field>
                          <Field label="Password">
                            <Input value={form.emailPassword} onChange={(value) => updateForm('emailPassword', value)} placeholder="e.g. P@ssw0rd123" />
                          </Field>
                        </div>
                      </SectionCard>

                      <SectionCard title="Generated Access" eyebrow="Auto">
                        <div className="flex flex-col gap-4">
                          <GeneratedValue
                            label="Bigoutsource Email"
                            value={preview.boEmail}
                          />

                          <GeneratedValue
                            label="LMS Account"
                            value={preview.lmsAccount}
                          />
                        </div>
                        {selectedAccountMissingCode && (
                          <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-500">
                            This preview uses the suggested account code. Add a stored department code to this account before saving.
                          </div>
                        )}
                      </SectionCard>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <SectionCard title="Assignment" eyebrow="Manual">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Field label="Site" required error={formErrors.siteId}>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsSiteDropdownOpen((current) => !current)}
                                className={cn(
                                  'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]',
                                  formErrors.siteId ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' : 'border-[#D1D5DB]'
                                )}
                              >
                                <span className="truncate">
                                  {sites.find((site) => site.id === form.siteId)?.name || 'Select site'}
                                </span>

                                <ChevronRight
                                  className={cn(
                                    'h-4 w-4 shrink-0 transition-transform',
                                    isSiteDropdownOpen && 'rotate-90'
                                  )}
                                />
                              </button>

                              <AnimatePresence>
{isSiteDropdownOpen && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
                                  <div className="max-h-64 overflow-y-auto">
                                    {sites.map((site) => (
                                      <button
                                        key={site.id}
                                        type="button"
                                        onClick={() => {
                                          updateForm('siteId', site.id);
                                          updateForm('status', 'active');
                                          setIsSiteDropdownOpen(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6]"
                                      >
                                        {site.name}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                              </AnimatePresence>
                            </div>
                          </Field>
                          <Field label="Status">
                            <div className="flex min-h-[42px] items-center rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3 text-sm font-bold text-[#4B5563]">
                              Active
                            </div>
                          </Field>
                        </div>
                      </SectionCard>

                      <SectionCard title="Snapshot" eyebrow="Status">
                        <ReviewGrid
                          items={[
                            ['Employee', [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') || 'Not entered'],
                            ['Employee ID', form.employeeNumber || 'Not entered'],
                            ['Account', form.accountAssignment || 'Not selected'],
                            ['Site', sites.find((site) => site.id === form.siteId)?.name || 'Not selected'],
                          ]}
                        />
                      </SectionCard>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <SectionCard title="Device Identity" eyebrow="Auto">
                        <GeneratedValue label="PC Name" value={preview.pcName} />
                      </SectionCard>

                      <SectionCard title="IT Assets" eyebrow="Manual">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        </div>
                      </SectionCard>
                    </div>
                  )}

                  {activeStep === 4 && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <SectionCard title="Employee Information" eyebrow="Review" onEdit={() => setActiveStep(0)} status={!validationForStep(0).employeeNumber && !validationForStep(0).firstName && !validationForStep(0).lastName ? 'complete' : 'missing'}>
                        <ReviewGrid
                          items={[
                            ['Employee ID', form.employeeNumber || 'Missing'],
                            ['Name', [form.firstName, form.middleName, form.lastName, form.suffix].filter(Boolean).join(' ') || 'Missing'],
                            ['Phone', form.phone || 'Not provided'],
                            ['Address', form.address || 'Not provided'],
                          ]}
                        />
                      </SectionCard>
                      <SectionCard title="Accounts" eyebrow="Review" onEdit={() => setActiveStep(1)} status={!validationForStep(1).accountAssignment ? 'complete' : 'missing'}>
                        <ReviewGrid
                          items={[
                            ['Account', form.accountAssignment || 'Missing'],
                            ['Email', preview.boEmail || 'Pending generation'],
                            ['LMS Account', preview.lmsAccount || 'Pending generation'],
                            ['Password', form.emailPassword ? 'Provided' : 'Not provided'],
                          ]}
                        />
                      </SectionCard>
                      <SectionCard title="Assignment" eyebrow="Review" onEdit={() => setActiveStep(2)} status={!validationForStep(2).siteId ? 'complete' : 'missing'}>
                        <ReviewGrid
                          items={[
                            ['Site', sites.find((site) => site.id === form.siteId)?.name || 'Missing'],
                            ['Status', form.status === 'active' ? 'Active' : 'Inactive'],
                          ]}
                        />
                      </SectionCard>
                      <SectionCard title="IT Assets" eyebrow="Review" onEdit={() => setActiveStep(3)} status="complete">
                        <ReviewGrid
                          items={[
                            ['PC Name', preview.pcName || 'Pending generation'],
                            ['RustDesk ID', form.rustdeskId || 'Not provided'],
                            ['Remote ID', form.remoteId || 'Not provided'],
                            ['ESET', form.esetStatus === 'active' ? 'Active' : 'Inactive'],
                            ['ActivityWatch', form.activityWatchStatus === 'installed' ? 'Installed' : 'Missing'],
                            ['BIOS Date', form.biosDate || 'Not provided'],
                          ]}
                        />
                      </SectionCard>
                      <div className="md:col-span-2 rounded-2xl border border-[#D1D5DB] bg-white p-5 shadow-lg shadow-[#1118270D]">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isReviewConfirmed}
                            onChange={(event) => setIsReviewConfirmed(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
                          />
                          <span>
                            <span className="block text-sm font-black text-[#111827]">Confirm onboarding details</span>
                            <span className="mt-1 block text-xs font-semibold text-[#6B7280]">Submit will create the employee record and clear the saved draft.</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-[#E5E7EB] bg-white/95 dark:bg-[#1A1D27]/95 px-6 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:bg-[#F9FAFB] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </button>
                  <div className="text-xs font-bold text-[#6B7280]">
                    <span className={cn('mr-2', draftSavedAt ? 'text-green-700' : 'text-[#9CA3AF]')}>
                      {draftSavedAt ? 'Draft Saved' : 'No Draft'}
                    </span>
                    <span>{isDraftRestored ? `Restored - ${draftSavedLabel}` : draftSavedLabel}</span>
                    {draftSavedAt && (
                      <button
                        type="button"
                        onClick={clearDraft}
                        className="ml-3 font-black text-[#4B5563] underline-offset-4 hover:text-[#111827] hover:underline focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={activeStep === 0 ? closeModal : goToPreviousStep}
                    disabled={isSaving}
                    className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:bg-[#F9FAFB] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-60"
                  >
                    {activeStep === 0 ? 'Cancel' : 'Back'}
                  </button>
                  {activeStep < wizardSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={goToNextStep}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSaving || !isReviewConfirmed}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#9CA3AF] disabled:shadow-none"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Submit Record
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </PageLayout>
  );
}

function SectionCard({
  title,
  eyebrow,
  description,
  onEdit,
  status,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  onEdit?: () => void;
  status?: 'complete' | 'missing';
  children: ReactNode;
}) {
  return (
    <section className="h-full rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-lg shadow-[#1118270D]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-black text-[#111827]">{title}</h3>
          {description && <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280]">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status && (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
                status === 'complete' ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'bg-red-50 text-red-700 ring-1 ring-red-100'
              )}
            >
              {status === 'complete' ? 'Complete' : 'Missing'}
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-black text-[#4B5563] transition-all hover:bg-[#F9FAFB] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
        {label}
        {required && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] text-red-600 ring-1 ring-red-100">Required</span>}
      </span>
      {children}
      {error && <span className="text-xs font-bold text-red-600">{error}</span>}
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
function FilterDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-[132px] items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]"
      >
        <span className="truncate">{options.find((o) => o.value === value)?.label || placeholder || value}</span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} />
      </button>
      <AnimatePresence>
{isOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-full w-max overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6]',
                    isSelected ? 'bg-[#EFF6FF]' : ''
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className={cn('truncate text-sm font-bold', isSelected ? 'text-[#2563EB]' : 'text-[#4B5563]')}>
                    {option.label}
                  </span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

function AccountFilterDropdown({
  value,
  onChange,
  internalAccounts,
  externalAccounts,
}: {
  value: string;
  onChange: (value: string) => void;
  internalAccounts: AccountOption[];
  externalAccounts: AccountOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderOption = (optionValue: string, label: string) => {
    const isSelected = value === optionValue;
    return (
      <button
        key={optionValue}
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6]',
          isSelected ? 'bg-[#EFF6FF]' : ''
        )}
        onClick={() => {
          onChange(optionValue);
          setIsOpen(false);
        }}
      >
        <span className={cn('truncate text-sm font-bold', isSelected ? 'text-[#2563EB]' : 'text-[#4B5563]')}>
          {label}
        </span>
        {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
      </button>
    );
  };

  const selectedLabel = value === 'All Account' ? 'All Accounts' : value;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-[200px] items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} />
      </button>
      <AnimatePresence>
{isOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-full w-max overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
          <div className="max-h-64 overflow-y-auto">
            <div className="py-1 border-b border-[#F3F4F6]">
              {renderOption('All Account', 'All Accounts')}
            </div>
            {internalAccounts.length > 0 && (
              <div className="border-b border-[#F3F4F6] last:border-b-0 pb-1">
                <div className="sticky top-0 bg-[#F9FAFB] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                  Internal
                </div>
                {internalAccounts.map((account) => renderOption(account.name, account.name))}
              </div>
            )}
            {externalAccounts.length > 0 && (
              <div className="border-b border-[#F3F4F6] last:border-b-0 pb-1">
                <div className="sticky top-0 bg-[#F9FAFB] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                  External
                </div>
                {externalAccounts.map((account) => renderOption(account.name, account.name))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#2563EB]',
        error ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' : 'border-[#D1D5DB]'
      )}
    />
  );
}

function GeneratedValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const isReady = Boolean(value);

  return (
    <div className={cn('rounded-2xl border p-4', isReady ? 'border-[#BFDBFE] dark:border-[#2563EB]/20 bg-[#F8FAFF] dark:bg-[#2563EB]/10' : 'border-[#E5E7EB] bg-[#F9FAFB]')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className={cn('h-3.5 w-3.5 shrink-0', isReady ? 'text-[#2563EB]' : 'text-[#9CA3AF]')} />
          <p className="truncate text-[10px] font-black uppercase tracking-widest text-[#6B7280]">{label}</p>
        </div>
        {isReady && <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#2563EB]">Generated</span>}
      </div>
      <p
        className={cn(
          'flex min-h-11 items-center rounded-xl border px-3 py-2.5 text-sm font-black',
          isReady
            ? 'border-[#DBEAFE] dark:border-[#2563EB]/30 bg-white text-[#111827]'
            : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
        )}
      >
        {value || '-'}
      </p>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#2563EB]',
        error ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' : 'border-[#D1D5DB]'
      )}
    >
      {children}
    </select>
  );
}

function ReviewGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <dt className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">{label}</dt>
          <dd className="mt-1 break-words text-sm font-black text-[#111827]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
