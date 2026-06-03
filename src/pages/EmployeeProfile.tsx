import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Globe,
  Key,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { generateLmsAccount } from '@/src/lib/lmsAccount';
import { employeeService } from '@/src/services/employeeService';
import { siteService } from '@/src/services/siteService';
import { auditLogService } from '@/src/services/auditLogService';
import { accountService } from '@/src/services/accountService';

type SiteOption = {
  id: string;
  name: string;
};

type AccountOption = {
  id: string;
  name: string;
  accountType: 'internal' | 'external';
  departmentCode: string;
};

type EmployeeForm = {
  employeeNumber: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  accountAssignment: string;
  phone: string;
  address: string;
  boEmail: string;
  emailPassword: string;
  lmsAccount: string;
  status: 'active' | 'inactive';
  siteId: string;
  site: string;
  pcName: string;
  biosDate: string;
  windowsKey: string;
  rustdeskId: string;
  remoteId: string;
  esetStatus: 'active' | 'inactive';
  activityWatchStatus: 'installed' | 'missing';
  isArchived?: boolean;
};

const emptyEmployee: EmployeeForm = {
  employeeNumber: '',
  fullName: '',
  firstName: '',
  middleName: '',
  lastName: '',
  accountAssignment: '',
  phone: '',
  address: '',
  boEmail: '',
  emailPassword: '',
  lmsAccount: '',
  status: 'active',
  siteId: '',
  site: '',
  pcName: '',
  biosDate: '',
  windowsKey: '',
  rustdeskId: '',
  remoteId: '',
  esetStatus: 'inactive',
  activityWatchStatus: 'missing',
  isArchived: false,
};

const editableFields: Array<keyof EmployeeForm> = [
  'employeeNumber',
  'firstName',
  'middleName',
  'lastName',
  'accountAssignment',
  'phone',
  'address',
  'boEmail',
  'emailPassword',
  'status',
  'siteId',
  'pcName',
  'biosDate',
  'windowsKey',
  'rustdeskId',
  'remoteId',
  'esetStatus',
  'activityWatchStatus',
];

function normalizeEsetStatus(value?: string): EmployeeForm['esetStatus'] {
  return value === 'Active' || value === 'active' || value === 'installed' ? 'active' : 'inactive';
}

function normalizeActivityWatch(value?: string): EmployeeForm['activityWatchStatus'] {
  return value === 'Installed' || value === 'installed' ? 'installed' : 'missing';
}

function formatStatus(value: string) {
  return value === 'active' ? 'Active' : 'Inactive';
}

function parseEmployeeName(fullName = '') {
  const name = String(fullName || '').trim();
  if (!name) return { firstName: '', middleName: '', lastName: '' };

  if (name.includes(',')) {
    const [lastName, rest] = name.split(',').map(s => s.trim());
    const restParts = rest.split(/\s+/).filter(Boolean);
    if (restParts.length === 1) return { firstName: restParts[0], middleName: '', lastName };
    return {
      firstName: restParts[0],
      middleName: restParts.slice(1).join(' '),
      lastName
    };
  }

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function formatEmployeeName(firstName = '', middleName = '', lastName = '') {
  const first = String(firstName || '').trim();
  const middle = String(middleName || '').trim();
  const last = String(lastName || '').trim();
  return [first, middle, last].filter(Boolean).join(' ');
}

function sanitizeNamePart(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generatedPreview(fullName = '', account?: AccountOption) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = sanitizeNamePart(parts[0] || '');
  const last = sanitizeNamePart(parts.length > 1 ? parts[parts.length - 1] : '');
  const middleInitials = parts
    .slice(1, -1)
    .map((part) => sanitizeNamePart(part).charAt(0))
    .join('');
  const code = account?.departmentCode || '';
  const identifier = `${first.charAt(0)}${middleInitials}${last}`;
  const domain = account?.accountType === 'internal' ? 'com' : ['hc', 'utd'].includes(code) ? 'team' : 'ph';

  return {
    boEmail: identifier && code ? `${identifier}.${code}@bigoutsource.${domain}` : '',
    pcName: identifier && code ? `${code}-${identifier}` : '',
  };
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function actionLabel(action: string) {
  const norm = action.toUpperCase();
  if (norm === 'UPDATE') return 'Updated record';
  if (norm === 'CREATE') return 'Created record';
  if (norm === 'DELETE') return 'Deleted record';
  if (norm === 'ARCHIVE') return 'Archived record';
  if (norm === 'UNARCHIVE') return 'Unarchived record';
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldName(field: string) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function detailsText(details: any) {
  if (!details) return [];

  if (Array.isArray(details.changes) && details.changes.length) {
    return details.changes.map((change: any) => ({
      field: formatFieldName(change.field),
      from: formatValue(change.from),
      to: formatValue(change.to),
    }));
  }

  return Object.entries(details)
    .filter(([key]) => key !== 'changes')
    .map(([key, value]) => ({
      field: formatFieldName(key),
      value: formatValue(value),
    }));
}

function actorLabel(log: any) {
  return log.userName || 'System';
}

function normalizeEmployee(emp: any): EmployeeForm {
  const fullName = emp?.fullName || '';
  const nameParts = parseEmployeeName(fullName);

  return {
    employeeNumber: emp?.employeeNumber || emp?.employeeId || '',
    fullName,
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    accountAssignment: emp?.accountAssignment || '',
    phone: emp?.phone || '',
    address: emp?.address || '',
    boEmail: emp?.boEmail || '',
    emailPassword: emp?.emailPassword || '',
    lmsAccount: generateLmsAccount(fullName) || emp?.lmsAccount || '',
    status: emp?.status || 'active',
    siteId: emp?.siteId || '',
    site: emp?.site || '',
    pcName: emp?.pcName || '',
    biosDate: emp?.biosDate ? String(emp.biosDate).slice(0, 10) : '',
    windowsKey: emp?.windowsKey || '',
    rustdeskId: emp?.rustdeskId || emp?.rustDeskId || '',
    remoteId: emp?.remoteId || '',
    esetStatus: normalizeEsetStatus(emp?.esetStatus || emp?.eset),
    activityWatchStatus: normalizeActivityWatch(emp?.activityWatchStatus),
    isArchived: emp?.is_archived ?? emp?.isArchived ?? false,
  };
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeForm>(emptyEmployee);
  const [form, setForm] = useState<EmployeeForm>(emptyEmployee);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveIntent, setArchiveIntent] = useState<'archive' | 'unarchive' | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isEsetDropdownOpen, setIsEsetDropdownOpen] = useState(false);
  const [isActivityWatchDropdownOpen, setIsActivityWatchDropdownOpen] = useState(false);
  const [visibleLogsCount, setVisibleLogsCount] = useState(3);
  const canManageEmployee = user?.role !== 'viewer';

  const missingDataStatus = useMemo(() => {
    let criticalCount = 0;
    let mildCount = 0;
    if (!employee.employeeNumber) criticalCount++;
    if (!employee.accountAssignment) criticalCount++;
    if (!employee.siteId && !employee.site) criticalCount++;
    
    if (!employee.phone) mildCount++;
    if (!employee.address) mildCount++;
    if (!employee.pcName) mildCount++;
    if (!employee.rustdeskId && !employee.remoteId) mildCount++;
    if (!employee.windowsKey) mildCount++;

    if (criticalCount > 0) return { type: 'critical', text: `${criticalCount} critical data missing` };
    if (mildCount > 0) return { type: 'warning', text: `${mildCount} incomplete data` };
    return null;
  }, [employee]);

  const hasChanges = useMemo(
    () => editableFields.some((field) => String(form[field] || '') !== String(employee[field] || '')),
    [form, employee]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!id) return;
      setIsLoading(true);

      try {
        const [employeeData, siteData, auditData] = await Promise.all([
          employeeService.get(id),
          siteService.list().catch(() => []),
          auditLogService.list({ entityType: 'employees', entityId: id, limit: 50 }).catch(() => []),
        ]);
        const accountData = await accountService.list().catch(() => []);

        if (!isMounted) return;

        const normalized = normalizeEmployee(employeeData);
        setEmployee(normalized);
        setForm(normalized);
        setSites((Array.isArray(siteData) ? siteData : []).map((site: any) => ({ id: site.id, name: site.name })));
        setAccounts((Array.isArray(accountData) ? accountData : []).map((account: any) => ({
          id: account.id,
          name: account.name,
          accountType: account.accountType || account.account_type || 'external',
          departmentCode: account.departmentCode || account.department_code || '',
        })));
        setAuditLogs(Array.isArray(auditData) ? auditData : []);
      } catch (error: any) {
        toast.error(error.message || 'Unable to load employee profile');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const updateForm = (field: keyof EmployeeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleReveal = () => {
    if (user?.role === 'viewer') {
      toast.error('Unauthorized to view sensitive info');
      return;
    }
    setShowSensitive(!showSensitive);
  };

  const startEditing = () => {
    if (!canManageEmployee) return;
    setForm(employee);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(employee);
    setIsEditing(false);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();

    if (!canManageEmployee) return;

    if (!id) return;

    if (!hasChanges) return;

    if (!form.employeeNumber.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.accountAssignment.trim() || !form.siteId) {
      toast.error('ID, first name, last name, account, and site are required');
      return;
    }

    const selectedSite = sites.find((site) => site.id === form.siteId);
    const fullName = formatEmployeeName(form.firstName, form.middleName, form.lastName);
    setIsSaving(true);

    try {
      const updated = await employeeService.update(id, {
        employeeNumber: form.employeeNumber.trim(),
        fullName,
        accountAssignment: form.accountAssignment.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        emailPassword: form.emailPassword.trim() || undefined,
        status: form.status,
        siteId: selectedSite?.id,
        siteName: selectedSite?.name,
        biosDate: form.biosDate || undefined,
        windowsKey: form.windowsKey.trim() || undefined,
        rustdeskId: form.rustdeskId.trim() || undefined,
        remoteId: form.remoteId.trim() || undefined,
        esetStatus: form.esetStatus,
        activityWatchStatus: form.activityWatchStatus,
      });

      const normalized = normalizeEmployee(updated);
      const refreshedLogs = await auditLogService.list({ entityType: 'employees', entityId: id, limit: 50 }).catch(() => auditLogs);
      setEmployee(normalized);
      setForm(normalized);
      setAuditLogs(Array.isArray(refreshedLogs) ? refreshedLogs : []);
      setIsEditing(false);
      toast.success('Employee record updated');
    } catch (error: any) {
      toast.error(error.message || 'Unable to update employee record');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArchiveEmployee = async () => {
    if (!canManageEmployee) return;
    if (!id) return;

    setIsArchiving(true);

    try {
      const newValue = !employee.isArchived;

      const updated = await employeeService.update(id, {
        ...employee,
        is_archived: newValue,
      });

      const normalized = normalizeEmployee(updated);

      setEmployee(normalized);
      setForm(normalized);

      toast.success(newValue ? 'Employee archived' : 'Employee unarchived');

      setShowArchiveModal(false);
      setArchiveIntent(null);
    } catch (error: any) {
      console.error('Archive error:', error);
      toast.error(error.message || 'Unable to update archive status');
    } finally {
      setIsArchiving(false);
    }
  };

  const pageTitle = employee.fullName ? `Profile: ${employee.fullName}` : 'Employee Profile';
  const selectedAccount = accounts.find((account) => account.name === form.accountAssignment);
  const preview = generatedPreview(form.fullName, selectedAccount);
  const accountBasedPreviewPlaceholder = selectedAccount
    ? 'Generated after name is entered'
    : 'Generated after name and department are entered';
  const internalAccounts = accounts.filter((account) => account.accountType === 'internal');
  const externalAccounts = accounts.filter((account) => account.accountType === 'external');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 30 } }
  };

  return (
    <PageLayout title={pageTitle}>
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div key="skeleton-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="flex flex-col gap-8 pb-12 w-full relative">
            <div className="relative bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm animate-pulse">
              <div className="h-24 bg-gray-200"></div>
              <div className="px-8 py-7 flex flex-col md:flex-row md:items-end gap-6">
                <div className="flex-1 min-w-0">
                  <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="flex gap-3">
                  <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 flex flex-col gap-8">
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 animate-pulse">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-gray-200" />
                    <div className="h-6 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="h-12 w-full bg-gray-200 rounded-xl" />
                    <div className="h-12 w-full bg-gray-200 rounded-xl" />
                    <div className="h-12 w-full bg-gray-200 rounded-xl" />
                    <div className="h-12 w-full bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-8">
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 animate-pulse">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-gray-200" />
                    <div className="h-6 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-6">
                    <div className="h-12 w-full bg-gray-200 rounded-xl" />
                    <div className="h-12 w-full bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
            <SkeletonLoadingMessage message="Fetching personnel records..." />
          </motion.div>
        ) : (
          <motion.form key="content-profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} onSubmit={saveProfile} className="flex flex-col gap-8 pb-12 w-full">
        <Link to="/directory" className="flex items-center gap-2 text-sm font-bold text-[#6B7280] hover:text-[#111827] transition-colors w-fit uppercase tracking-tighter">
          <ArrowLeft className="w-4 h-4" />
          Employee Directory
        </Link>

        <div className="relative bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
          <div className="h-32 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827]"></div>
          
          <div className="px-8 pb-8 pt-4 flex flex-col md:flex-row md:items-end gap-6 relative">
            <div className="absolute -top-16 left-8">
              <div className="w-28 h-28 rounded-full border-4 border-white bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] shadow-lg flex items-center justify-center text-4xl font-black text-[#111827] uppercase tracking-tighter">
                {employee.fullName?.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('') || 'EP'}
              </div>
            </div>
            
            <div className="flex-1 min-w-0 mt-14 md:mt-0 md:ml-32">
              <AnimatePresence mode="popLayout" initial={false}>
                {isEditing ? (
                  <motion.div 
                    key="edit-mode"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                  >
                    <Field label="ID" required>
                      <Input value={form.employeeNumber} onChange={(value) => updateForm('employeeNumber', value)} placeholder="e.g. 1004" />
                    </Field>
                    <Field label="First Name" required>
                      <Input value={form.firstName} onChange={(value) => updateForm('firstName', value)} placeholder="e.g. John" />
                    </Field>
                    <Field label="Middle Name">
                      <Input value={form.middleName} onChange={(value) => updateForm('middleName', value)} placeholder="e.g. Doe" />
                    </Field>
                    <Field label="Last Name" required>
                      <Input value={form.lastName} onChange={(value) => updateForm('lastName', value)} placeholder="e.g. Smith" />
                    </Field>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="view-mode"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-black text-[#111827] tracking-tight">
                        {employee.fullName || 'Unnamed Employee'}
                      </h2>

                      {employee.isArchived && (
                        <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-black uppercase tracking-wider ring-1 ring-red-200/60 shadow-sm">
                          Archived
                        </span>
                      )}

                      {missingDataStatus && (
                        <div className={cn(
                          'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 shadow-sm',
                          missingDataStatus.type === 'critical' ? 'bg-red-50 text-red-700 ring-red-200/60' : 'bg-amber-50 text-amber-700 ring-amber-200/60'
                        )}>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {missingDataStatus.text}
                        </div>
                      )}
                    </div>

                    <p className="text-[#6B7280] font-bold mt-1 uppercase text-xs tracking-widest">
                      {employee.employeeNumber || 'No ID'} | {employee.site || 'Unassigned'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !hasChanges}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] text-white rounded-xl text-sm font-bold hover:bg-[#374151] disabled:bg-[#D1D5DB] disabled:shadow-none disabled:cursor-not-allowed transition-all shadow-lg shadow-[#11182720]"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </>
              ) : canManageEmployee ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] text-white rounded-xl text-sm font-bold hover:bg-[#374151] transition-all shadow-lg shadow-[#11182720]"
                  >
                    <Edit className="w-4 h-4" />
                    Update Record
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArchiveIntent(employee.isArchived ? 'unarchive' : 'archive');
                      setShowArchiveModal(true);
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
                      employee.isArchived
                        ? "bg-green-600 text-white hover:bg-green-700 shadow-green-500/20"
                        : "bg-red-600 text-white hover:bg-red-700 shadow-red-500/20"
                    }`}
                  >
                    {employee.isArchived ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Unarchive
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Archive
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
            <ProfileSection icon={Briefcase} title="Work & Account Info" iconColorClass="text-blue-600 bg-blue-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <ProfileField label="Department/Account Type" icon={Briefcase} editing={isEditing}>
                  {isEditing ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAccountDropdownOpen((current) => !current)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]',
                          !form.accountAssignment ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
                        )}
                      >
                        <span className="truncate">{form.accountAssignment || 'Select department'}</span>
                        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform text-[#9CA3AF]', isAccountDropdownOpen && 'rotate-90')} />
                      </button>
                      <AnimatePresence>
                        {isAccountDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsAccountDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
                            >
                              {accounts.length ? (
                                <div className="max-h-64 overflow-y-auto">
                                  <AccountDropdownGroup title="Internal" accounts={internalAccounts} onSelect={(acc) => { updateForm('accountAssignment', acc.name); setIsAccountDropdownOpen(false); }} />
                                  <AccountDropdownGroup title="External" accounts={externalAccounts} onSelect={(acc) => { updateForm('accountAssignment', acc.name); setIsAccountDropdownOpen(false); }} />
                                </div>
                              ) : (
                                <div className="px-3 py-3 text-xs font-bold text-[#6B7280]">No departments yet</div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    employee.accountAssignment || 'Not Assigned'
                  )}
                </ProfileField>
                <ProfileField label="BigOutsource Email" icon={Mail} editing={isEditing}>
                  {isEditing ? <GeneratedValue value={preview.boEmail} placeholder={accountBasedPreviewPlaceholder} /> : employee.boEmail || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="Email Password" icon={Key} editing={isEditing}>
                  {isEditing ? <Input value={form.emailPassword} onChange={(value) => updateForm('emailPassword', value)} placeholder="e.g. P@ssw0rd123" /> : employee.emailPassword || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="LMS Account" icon={User} editing={isEditing}>
                  {isEditing ? (
                    <div className="px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563]">
                      {generateLmsAccount(formatEmployeeName(form.firstName, form.lastName)) || 'Generated after name is entered'}
                    </div>
                  ) : (
                    employee.lmsAccount || 'Not Assigned'
                  )}
                </ProfileField>
                <ProfileField label="Status" icon={ShieldCheck} editing={isEditing}>
                  {isEditing ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStatusDropdownOpen((current) => !current)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]',
                          'border-[#E5E7EB]'
                        )}
                      >
                        <span className="truncate">{formatStatus(form.status)}</span>
                        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform text-[#9CA3AF]', isStatusDropdownOpen && 'rotate-90')} />
                      </button>
                      <AnimatePresence>
                        {isStatusDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
                            >
                              <div className="max-h-64 overflow-y-auto py-1">
                                {[{ id: 'active', name: 'Active' }, { id: 'inactive', name: 'Inactive' }].map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      updateForm('status', opt.id as any);
                                      setIsStatusDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2.5 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6]"
                                  >
                                    {opt.name}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    formatStatus(employee.status)
                  )}
                </ProfileField>
                <ProfileField label="Site" icon={MapPin} editing={isEditing}>
                  {isEditing ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSiteDropdownOpen((current) => !current)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]',
                          !form.siteId ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
                        )}
                      >
                        <span className="truncate">
                          {sites.find((site) => site.id === form.siteId)?.name || 'Select site'}
                        </span>
                        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform text-[#9CA3AF]', isSiteDropdownOpen && 'rotate-90')} />
                      </button>
                      <AnimatePresence>
                        {isSiteDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsSiteDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
                            >
                              <div className="max-h-64 overflow-y-auto py-1">
                                {sites.map((site) => (
                                  <button
                                    key={site.id}
                                    type="button"
                                    onClick={() => {
                                      updateForm('siteId', site.id);
                                      setIsSiteDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2.5 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6]"
                                  >
                                    {site.name}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    employee.site || 'Unassigned'
                  )}
                </ProfileField>
              </div>
            </ProfileSection>

            <ProfileSection icon={Laptop} title="Device Assets" iconColorClass="text-purple-600 bg-purple-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <ProfileField label="PC Name" icon={Laptop} editing={isEditing}>
                  {isEditing ? <GeneratedValue value={preview.pcName} placeholder={accountBasedPreviewPlaceholder} /> : employee.pcName || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="BIOS Date" icon={Calendar} editing={isEditing}>
                  {isEditing ? <Input type="date" value={form.biosDate} onChange={(value) => updateForm('biosDate', value)} /> : employee.biosDate ? new Date(employee.biosDate).toLocaleDateString() : 'Not Set'}
                </ProfileField>
                <ProfileField label="RustDesk ID" icon={Globe} editing={isEditing}>
                  {isEditing ? <Input value={form.rustdeskId} onChange={(value) => updateForm('rustdeskId', value)} placeholder="e.g. 123 456 789" /> : employee.rustdeskId || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="Remote ID" icon={Globe} editing={isEditing}>
                  {isEditing ? <Input value={form.remoteId} onChange={(value) => updateForm('remoteId', value)} placeholder="e.g. 123 456 789" /> : employee.remoteId || 'Not Assigned'}
                </ProfileField>
              </div>

              <div className="mt-10 p-5 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1.5">Windows License Key</p>
                  {isEditing ? (
                    <Input value={form.windowsKey} onChange={(value) => updateForm('windowsKey', value)} placeholder="e.g. XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" />
                  ) : (
                    <p className="text-sm font-mono font-black text-[#111827] bg-[#F3F4F6] px-2 py-0.5 rounded w-fit">
                      {showSensitive ? employee.windowsKey || 'Not Assigned' : '*****-*****-*****-*****-*****'}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleReveal}
                    className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-xl text-xs font-bold text-[#4B5563] hover:text-[#111827] transition-all"
                  >
                    {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSensitive ? 'Hide' : 'Reveal Key'}
                  </button>
                )}
              </div>
            </ProfileSection>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
            <ProfileSection icon={ShieldAlert} title="Security Compliance" compact iconColorClass="text-amber-600 bg-amber-50">
              <div className="space-y-4">
                <ComplianceField
                  label="ESET Status"
                  value={formatStatus(employee.esetStatus)}
                  editing={isEditing}
                  status={employee.esetStatus === 'active'}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsEsetDropdownOpen((current) => !current)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]',
                        'border-[#E5E7EB]'
                      )}
                    >
                      <span className="truncate">{formatStatus(form.esetStatus)}</span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform text-[#9CA3AF]', isEsetDropdownOpen && 'rotate-90')} />
                    </button>
                    <AnimatePresence>
                      {isEsetDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsEsetDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
                          >
                            <div className="max-h-64 overflow-y-auto py-1">
                              {[{ id: 'active', name: 'Active' }, { id: 'inactive', name: 'Inactive' }].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    updateForm('esetStatus', opt.id as any);
                                    setIsEsetDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6]"
                                >
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </ComplianceField>
                <ComplianceField
                  label="ActivityWatch"
                  value={employee.activityWatchStatus === 'installed' ? 'Installed' : 'Missing'}
                  editing={isEditing}
                  status={employee.activityWatchStatus === 'installed'}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsActivityWatchDropdownOpen((current) => !current)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]',
                        'border-[#E5E7EB]'
                      )}
                    >
                      <span className="truncate">{form.activityWatchStatus === 'installed' ? 'Installed' : 'Missing'}</span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform text-[#9CA3AF]', isActivityWatchDropdownOpen && 'rotate-90')} />
                    </button>
                    <AnimatePresence>
                      {isActivityWatchDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsActivityWatchDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
                          >
                            <div className="max-h-64 overflow-y-auto py-1">
                              {[{ id: 'installed', name: 'Installed' }, { id: 'missing', name: 'Missing' }].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    updateForm('activityWatchStatus', opt.id as any);
                                    setIsActivityWatchDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6]"
                                >
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </ComplianceField>
              </div>
            </ProfileSection>

            <ProfileSection icon={Phone} title="Contact & Location" compact iconColorClass="text-teal-600 bg-teal-50">
              <div className="space-y-6">
                <ProfileField label="Phone Number" editing={isEditing}>
                  {isEditing ? <Input value={form.phone} onChange={(value) => updateForm('phone', value)} placeholder="e.g. 09123456789" /> : employee.phone || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="Address" editing={isEditing}>
                  {isEditing ? <Input value={form.address} onChange={(value) => updateForm('address', value)} placeholder="e.g. 123 Main St, City" /> : employee.address || 'Not Assigned'}
                </ProfileField>
              </div>
            </ProfileSection>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-12">
            <ProfileSection icon={Clock} title="Audit History" iconColorClass="text-indigo-600 bg-indigo-50">
              <div className="relative pl-4 md:pl-0">
                {auditLogs.length ? (
                  <>
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#E5E7EB] before:via-[#E5E7EB] before:to-transparent">
                    <AnimatePresence initial={false}>
                      {auditLogs.slice(0, visibleLogsCount).map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                        >
                          {/* Timeline node */}
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Clock className="w-4 h-4" />
                        </div>

                        {/* Card */}
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                          <div className="flex flex-col gap-1 mb-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-black text-[#111827]">{actionLabel(log.action)}</p>
                              <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider">{formatDate(log.createdAt)}</p>
                            </div>
                            <p className="text-xs font-bold text-[#6B7280]">by {actorLabel(log)}</p>
                          </div>
                          <div className="space-y-2">
                            {detailsText(log.details).map((item: any, index: number) => (
                              <div
                                key={index}
                                className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3"
                              >
                                {'to' in item ? (
                                  <div className="flex flex-col gap-1 text-sm">
                                    <span className="font-black text-[#111827]">
                                      {item.field}
                                    </span>

                                    <div className="flex items-center gap-2 text-[#6B7280]">
                                      <span className="line-through text-red-500">
                                        {item.from}
                                      </span>

                                      <span className="font-bold text-[#9CA3AF]">→</span>

                                      <span className="font-bold text-green-600">
                                        {item.to}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between text-sm">
                                    <span className="font-black text-[#111827]">
                                      {item.field}
                                    </span>

                                    <span className="text-[#4B5563] font-medium">
                                      {item.value}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="mt-8 flex justify-center gap-4">
                    {visibleLogsCount > 3 && (
                      <button
                        type="button"
                        onClick={() => setVisibleLogsCount(prev => Math.max(3, prev - 3))}
                        className="px-6 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm font-bold text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] hover:shadow-sm transition-all shadow-sm"
                      >
                        View less
                      </button>
                    )}
                    {visibleLogsCount < auditLogs.length && (
                      <button
                        type="button"
                        onClick={() => setVisibleLogsCount(prev => Math.min(prev + 3, auditLogs.length))}
                        className="px-6 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm font-bold text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] hover:shadow-sm transition-all shadow-sm"
                      >
                        View {Math.min(3, auditLogs.length - visibleLogsCount)} more {auditLogs.length - visibleLogsCount === 1 ? 'record' : 'records'}
                      </button>
                    )}
                  </div>
                  </>
                ) : (
                  <p className="text-sm font-bold text-[#9CA3AF]">No audit history for this employee yet.</p>
                )}
              </div>
            </ProfileSection>
          </motion.div>
        </motion.div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canManageEmployee && showArchiveModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl p-6"
            >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  employee.isArchived
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {employee.isArchived ? (
                  <RotateCcw className="w-6 h-6" />
                ) : (
                  <Archive className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-black text-[#111827]">
                  {archiveIntent === 'unarchive'
                    ? 'Unarchive Employee'
                    : 'Archive Employee'}
                </h3>

                <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                  Are you sure you want to{' '}
                  <span className="font-bold text-[#111827]">
                    {archiveIntent === 'unarchive'
                      ? `unarchive ${employee.fullName}`
                      : `archive ${employee.fullName}`}
                  </span>
                  ?
                </p>

                <p className="mt-2 text-sm text-[#6B7280]">
                  {archiveIntent === 'unarchive'
                    ? 'This employee will be restored to the active directory.'
                    : 'This employee will be removed from the active directory.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowArchiveModal(false);
                  setArchiveIntent(null);
                }}
                disabled={isArchiving}
                className="px-4 py-2.5 border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={toggleArchiveEmployee}
                disabled={isArchiving}
                className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 ${
                  archiveIntent === 'unarchive'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isArchiving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : archiveIntent === 'unarchive' ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}

                {archiveIntent === 'unarchive'
                  ? 'Confirm Unarchive'
                  : 'Confirm Archive'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

function ProfileSection({
  icon: Icon,
  title,
  children,
  compact = false,
  iconColorClass = 'text-[#111827] bg-[#F3F4F6]',
}: {
  icon: ElementType;
  title: string;
  children: ReactNode;
  compact?: boolean;
  iconColorClass?: string;
}) {
  return (
    <motion.section 
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
      className={cn('bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-xl transition-shadow duration-300', compact ? 'p-6' : 'p-8')}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className={cn('p-2 rounded-xl', iconColorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-black text-[#111827]">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function ProfileField({
  label,
  icon: Icon,
  editing,
  children,
}: {
  label: string;
  icon?: ElementType;
  editing?: boolean;
  children: ReactNode;
}) {
  const isMissing = !editing && (
    children === 'Not Assigned' || 
    children === 'Not Set' || 
    children === 'Unassigned' || 
    children === '' || 
    children === null || 
    children === undefined
  );

  return (
    <div className={cn("group rounded-xl transition-colors duration-200", !editing && "-mx-3 px-3 py-2 hover:bg-[#F9FAFB]")}>
      <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1.5">{label}</p>
      <AnimatePresence mode="popLayout" initial={false}>
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="flex items-center gap-3"
          >
            {Icon && <Icon className={cn("w-4 h-4 transition-colors", isMissing ? "text-red-400 group-hover:text-red-500" : "text-[#D1D5DB] group-hover:text-[#9CA3AF]")} />}
            <span className={cn("text-sm font-bold flex items-center gap-1.5", isMissing ? "text-red-600" : "text-[#111827]")}>
              {children}
              {isMissing && <ShieldAlert className="w-3.5 h-3.5" />}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComplianceField({
  label,
  value,
  status,
  editing,
  children,
}: {
  label: string;
  value: string;
  status: boolean;
  editing: boolean;
  children: ReactNode;
}) {
  return (
    <div className="group p-4 rounded-xl border border-[#E5E7EB] hover:border-[#CBD5E1] hover:shadow-md transition-all duration-300">
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 group-hover:text-[#6B7280] transition-colors">{label}</p>
      <AnimatePresence mode="popLayout" initial={false}>
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="flex items-center justify-between"
          >
            <p className="text-sm font-black text-[#111827]">{value}</p>
            <div className={cn('w-2.5 h-2.5 rounded-full shadow-sm', status ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function GeneratedValue({ value, placeholder }: { value: string; placeholder: string }) {
  return (
    <div className="w-full px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563]">
      {value || placeholder}
    </div>
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
