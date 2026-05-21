import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  Download,
  Laptop,
  Loader2,
  MapPin,
  Search,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { MOCK_EMPLOYEES, Employee } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { employeeService } from '@/src/services/employeeService';
import { siteService } from '@/src/services/siteService';

type SiteOption = {
  id: string;
  name: string;
};

type EmployeeRecord = Employee & {
  employeeNumber?: string;
  emailPassword?: string;
  siteId?: string;
  rustdeskId?: string;
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
};

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

export default function Directory() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [sites, setSites] = useState<SiteOption[]>(mockSites);
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<AddEmployeeForm>(initialForm);

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

  const filteredEmployees = employees.filter((emp) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      emp.fullName.toLowerCase().includes(search) ||
      emp.employeeId.toLowerCase().includes(search) ||
      emp.pcName.toLowerCase().includes(search) ||
      emp.accountAssignment.toLowerCase().includes(search);

    const matchesSite = siteFilter === 'All' || emp.site === siteFilter;
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter.toLowerCase();

    return matchesSearch && matchesSite && matchesStatus;
  });

  const updateForm = (field: keyof AddEmployeeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
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
    toast.error('Import validation: Please select a valid Excel file');
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
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
      toast.success('Employee record added');
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Unable to add employee record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout title="Personnel Database">
      <div className="flex flex-col gap-6">
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
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] transition-all"
            >
              <Download className="w-4 h-4" />
              Import
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
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Employee Information</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Account & Site</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">IT Asset (PC Name)</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Security</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#F9FAFB] transition-colors group">
                  <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-black text-[#111827]">{emp.fullName}</p>
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-bold text-[#111827]">{emp.accountAssignment}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                      <span className="text-xs text-[#6B7280]">{emp.site}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-[#D1D5DB]" />
                      <p className="text-sm font-mono font-bold text-[#111827]">{emp.pcName || 'Unassigned'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full', emp.esetStatus === 'Active' ? 'bg-green-500' : 'bg-red-500')} />
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase">ESET</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full', emp.activityWatchStatus === 'Installed' ? 'bg-green-500' : 'bg-red-500')} />
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase">ActivityWatch</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter',
                        emp.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/employee/${emp.id}`}
                      className="p-2 text-[#9CA3AF] hover:text-[#111827] hover:bg-white rounded-xl transition-all inline-flex items-center gap-2 text-xs font-bold"
                    >
                      View Profile
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(isLoading || filteredEmployees.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                {isLoading ? <Loader2 className="w-8 h-8 text-[#9CA3AF] animate-spin" /> : <Search className="w-8 h-8 text-[#D1D5DB]" />}
              </div>
              <h3 className="text-lg font-bold text-[#111827]">{isLoading ? 'Loading records' : 'No records found'}</h3>
              <p className="text-sm text-[#6B7280]">{isLoading ? 'Fetching personnel data from the database.' : 'Try adjusting your filters or search keywords.'}</p>
            </div>
          )}

          <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
              Total Personnel: {filteredEmployees.length}
            </p>
            <div className="flex gap-2">
              <button disabled className="px-4 py-1.5 border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#9CA3AF] cursor-not-allowed">Previous</button>
              <button className="px-4 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#111827] hover:bg-[#F3F4F6]">Next</button>
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
                  <Input value={form.accountAssignment} onChange={(value) => updateForm('accountAssignment', value)} placeholder="Account or project" />
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
