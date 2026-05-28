import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Briefcase,
  Calendar,
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
import { PageLayout } from '@/src/components/layout/PageLayout';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { employeeService } from '@/src/services/employeeService';
import { siteService } from '@/src/services/siteService';
import { auditLogService } from '@/src/services/auditLogService';

type SiteOption = {
  id: string;
  name: string;
};

type EmployeeForm = {
  employeeNumber: string;
  fullName: string;
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
  'fullName',
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

function generateLmsAccount(fullName = '') {
  const parts = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].replace(/['-]/g, '');

  return `${parts[0].replace(/['-]/g, '')}.${parts[parts.length - 1].replace(/['-]/g, '')}`;
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
  return action.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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

function normalizeEmployee(emp: any): EmployeeForm {
  return {
    employeeNumber: emp?.employeeNumber || emp?.employeeId || '',
    fullName: emp?.fullName || '',
    accountAssignment: emp?.accountAssignment || '',
    phone: emp?.phone || '',
    address: emp?.address || '',
    boEmail: emp?.boEmail || '',
    emailPassword: emp?.emailPassword || '',
    lmsAccount: emp?.lmsAccount || '',
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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveIntent, setArchiveIntent] = useState<'archive' | 'unarchive' | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

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

        if (!isMounted) return;

        const normalized = normalizeEmployee(employeeData);
        setEmployee(normalized);
        setForm(normalized);
        setSites((Array.isArray(siteData) ? siteData : []).map((site: any) => ({ id: site.id, name: site.name })));
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
    setForm(employee);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(employee);
    setIsEditing(false);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();

    if (!id) return;

    if (!hasChanges) return;

    if (!form.employeeNumber.trim() || !form.fullName.trim() || !form.accountAssignment.trim() || !form.siteId) {
      toast.error('ID, name, account, and site are required');
      return;
    }

    const selectedSite = sites.find((site) => site.id === form.siteId);
    setIsSaving(true);

    try {
      const updated = await employeeService.update(id, {
        employeeNumber: form.employeeNumber.trim(),
        fullName: form.fullName.trim(),
        accountAssignment: form.accountAssignment.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        boEmail: form.boEmail.trim() || undefined,
        emailPassword: form.emailPassword.trim() || undefined,
        status: form.status,
        siteId: selectedSite?.id,
        siteName: selectedSite?.name,
        pcName: form.pcName.trim() || undefined,
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

  if (isLoading) {
    return (
      <PageLayout title="Employee Profile">
        <div className="h-96 flex flex-col items-center justify-center text-[#6B7280]">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm font-bold">Loading employee profile</p>
        </div>
      </PageLayout>
    );
  }

  const pageTitle = employee.fullName ? `Profile: ${employee.fullName}` : 'Employee Profile';

  return (
    <PageLayout title={pageTitle}>
      <form onSubmit={saveProfile} className="flex flex-col gap-8 pb-12">
        <Link to="/directory" className="flex items-center gap-2 text-sm font-bold text-[#6B7280] hover:text-[#111827] transition-colors w-fit uppercase tracking-tighter">
          <ArrowLeft className="w-4 h-4" />
          Employee Directory
        </Link>

        <div className="relative bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="h-24 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827]"></div>
          <div className="px-8 py-7 flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="ID" required>
                    <Input value={form.employeeNumber} onChange={(value) => updateForm('employeeNumber', value)} />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Name" required>
                      <Input value={form.fullName} onChange={(value) => updateForm('fullName', value)} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-[#111827] tracking-tight">
                        {employee.fullName || 'Unnamed Employee'}
                      </h2>

                      {employee.isArchived ? (
                        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                          Archived
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-[#6B7280] font-bold mt-1 uppercase text-xs tracking-widest">
                      {employee.employeeNumber || 'No ID'} | {employee.site || 'Unassigned'}
                    </p>
                  </div>
                </div>
              )}
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
              ) : (
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
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <ProfileSection icon={Globe} title="Work & Account Info">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <ProfileField label="Account/Project" icon={Briefcase} editing={isEditing}>
                  {isEditing ? <Input value={form.accountAssignment} onChange={(value) => updateForm('accountAssignment', value)} /> : employee.accountAssignment || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="BigOutsource Email" icon={Mail} editing={isEditing}>
                  {isEditing ? <Input type="email" value={form.boEmail} onChange={(value) => updateForm('boEmail', value)} /> : employee.boEmail || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="Email Password" icon={Key} editing={isEditing}>
                  {isEditing ? <Input value={form.emailPassword} onChange={(value) => updateForm('emailPassword', value)} /> : employee.emailPassword || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="LMS Account" icon={User} editing={isEditing}>
                  {isEditing ? (
                    <div className="px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563]">
                      {generateLmsAccount(form.fullName) || 'Generated after name is entered'}
                    </div>
                  ) : (
                    employee.lmsAccount || 'Not Assigned'
                  )}
                </ProfileField>
                <ProfileField label="Status" icon={ShieldCheck} editing={isEditing}>
                  {isEditing ? (
                    <Select value={form.status} onChange={(value) => updateForm('status', value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  ) : (
                    employee.status.toUpperCase()
                  )}
                </ProfileField>
                <ProfileField label="Site" icon={MapPin} editing={isEditing}>
                  {isEditing ? (
                    <Select value={form.siteId} onChange={(value) => updateForm('siteId', value)}>
                      <option value="">Select site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    employee.site || 'Unassigned'
                  )}
                </ProfileField>
              </div>
            </ProfileSection>

            <ProfileSection icon={Laptop} title="Device Assets">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <ProfileField label="PC Name" icon={Laptop} editing={isEditing}>
                  {isEditing ? <Input value={form.pcName} onChange={(value) => updateForm('pcName', value)} /> : employee.pcName || 'Unassigned'}
                </ProfileField>
                <ProfileField label="BIOS Date" icon={Calendar} editing={isEditing}>
                  {isEditing ? <Input type="date" value={form.biosDate} onChange={(value) => updateForm('biosDate', value)} /> : employee.biosDate || 'Not Set'}
                </ProfileField>
                <ProfileField label="RustDesk ID" icon={Globe} editing={isEditing}>
                  {isEditing ? <Input value={form.rustdeskId} onChange={(value) => updateForm('rustdeskId', value)} /> : employee.rustdeskId || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="Remote ID" icon={ShieldCheck} editing={isEditing}>
                  {isEditing ? <Input value={form.remoteId} onChange={(value) => updateForm('remoteId', value)} /> : employee.remoteId || 'Not Assigned'}
                </ProfileField>
              </div>

              <div className="mt-10 p-5 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1.5">Windows License Key</p>
                  {isEditing ? (
                    <Input value={form.windowsKey} onChange={(value) => updateForm('windowsKey', value)} />
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
          </div>

          <div className="lg:col-span-4 space-y-8">
            <ProfileSection icon={ShieldAlert} title="Security Compliance" compact>
              <div className="space-y-4">
                <ComplianceField
                  label="ESET Status"
                  value={formatStatus(employee.esetStatus)}
                  editing={isEditing}
                  status={employee.esetStatus === 'active'}
                >
                  <Select value={form.esetStatus} onChange={(value) => updateForm('esetStatus', value)}>
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                  </Select>
                </ComplianceField>
                <ComplianceField
                  label="ActivityWatch"
                  value={formatStatus(employee.activityWatchStatus)}
                  editing={isEditing}
                  status={employee.activityWatchStatus === 'installed'}
                >
                  <Select value={form.activityWatchStatus} onChange={(value) => updateForm('activityWatchStatus', value)}>
                    <option value="missing">Missing</option>
                    <option value="installed">Installed</option>
                  </Select>
                </ComplianceField>
              </div>
            </ProfileSection>

            <ProfileSection icon={Phone} title="Contact & Location" compact>
              <div className="space-y-6">
                <ProfileField label="Phone Number" editing={isEditing}>
                  {isEditing ? <Input value={form.phone} onChange={(value) => updateForm('phone', value)} /> : employee.phone || 'Not Assigned'}
                </ProfileField>
                <ProfileField label="Address" editing={isEditing}>
                  {isEditing ? <Input value={form.address} onChange={(value) => updateForm('address', value)} /> : employee.address || 'Not Assigned'}
                </ProfileField>
              </div>
            </ProfileSection>
          </div>

          <div className="lg:col-span-12">
            <ProfileSection icon={Clock} title="Audit History">
              <div className="space-y-4">
                {auditLogs.length ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#111827]">{actionLabel(log.action)}</p>
                          <p className="text-xs font-bold text-[#6B7280] mt-1">by {log.userEmail || 'System'}</p>
                        </div>
                        <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider">{formatDate(log.createdAt)}</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        {detailsText(log.details).map((item: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3"
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
                  ))
                ) : (
                  <p className="text-sm font-bold text-[#9CA3AF]">No audit history for this employee yet.</p>
                )}
              </div>
            </ProfileSection>
          </div>
        </div>
      </form>

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl p-6">
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
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function ProfileSection({
  icon: Icon,
  title,
  children,
  compact = false,
}: {
  icon: ElementType;
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={cn('bg-white rounded-2xl border border-[#E5E7EB] shadow-sm', compact ? 'p-6' : 'p-8')}>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827]">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-black text-[#111827]">{title}</h3>
      </div>
      {children}
    </section>
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
  return (
    <div>
      <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1.5">{label}</p>
      {editing ? (
        children
      ) : (
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-4 h-4 text-[#D1D5DB]" />}
          <span className="text-sm font-bold text-[#111827]">{children}</span>
        </div>
      )}
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
    <div className="p-4 rounded-xl border border-[#E5E7EB]">
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5">{label}</p>
      {editing ? (
        children
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#111827]">{value}</p>
          <div className={cn('w-2.5 h-2.5 rounded-full shadow-sm', status ? 'bg-green-500' : 'bg-red-500')} />
        </div>
      )}
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
