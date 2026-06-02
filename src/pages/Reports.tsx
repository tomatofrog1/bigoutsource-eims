import { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileText, Download, PieChart, BarChart, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import toast from 'react-hot-toast';
import { employeeService } from '@/src/services/employeeService';
import { siteService } from '@/src/services/siteService';
import { auditLogService } from '@/src/services/auditLogService';

// ─── Shared utilities ─────────────────────────────────────────────────────────

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function capitalize(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface SheetDef {
  name: string;
  rows: Record<string, string | number>[];
}

function buildWorkbook(sheets: SheetDef[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '(No records)': '' }]);
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      ws['!cols'] = keys.map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
      }));
    }
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

// ─── Report 1: Employee Master List ──────────────────────────────────────────

async function generateEmployeeMasterList(): Promise<string> {
  const employees = asArray(await employeeService.list());
  if (!employees.length) throw new Error('No employee records found.');

  const rows = employees.map((e) => ({
    'Employee ID': e.id ?? '',
    'Full Name': e.fullName ?? '',
    'Status': capitalize(e.status),
    'Site': e.site ?? '',
    'Account': e.accountAssignment ?? '',
    'BO Email': e.boEmail ?? '',
    'LMS Account': e.lmsAccount ?? '',
    'Phone': e.phone ?? '',
    'Address': e.address ?? '',
    'Archived': e.isArchived ? 'Yes' : 'No',
    'Last Updated': formatDate(e.updatedAt),
  }));

  buildWorkbook([{ name: 'Employees', rows }], 'Employee_Master_List.xlsx');
  return `${employees.length} employees exported`;
}

// ─── Report 2: IT Asset & License Report ─────────────────────────────────────

async function generateITAssetReport(): Promise<string> {
  const employees = asArray(await employeeService.list());
  const withDevices = employees.filter((e) => e.pcName);

  if (!withDevices.length) throw new Error('No IT asset records found. Assign PC names to employees first.');

  const rows = withDevices.map((e) => ({
    'Employee ID': e.id ?? '',
    'Full Name': e.fullName ?? '',
    'Site': e.site ?? '',
    'PC Name': e.pcName ?? '',
    'BIOS Date': e.biosDate ?? '',
    'Windows License Key': e.windowsKey ?? '',
    'Rust Desk ID': e.rustDeskId ?? '',
    'Remote ID': e.remoteId ?? '',
    'ESET Status': capitalize(e.esetStatus),
    'ActivityWatch': capitalize(e.activityWatchStatus),
  }));

  buildWorkbook([{ name: 'IT Assets', rows }], 'IT_Asset_License_Report.xlsx');
  return `${withDevices.length} devices exported`;
}

// ─── Report 3: Security Compliance Audit ─────────────────────────────────────

async function generateSecurityAudit(): Promise<string> {
  const employees = asArray(await employeeService.list());

  const noEset = employees.filter((e) => String(e.esetStatus ?? '').toLowerCase() !== 'active');
  const noAw = employees.filter((e) => String(e.activityWatchStatus ?? '').toLowerCase() !== 'installed');
  const noKey = employees.filter((e) => !e.windowsKey);
  const flagged = employees.filter(
    (e) =>
      String(e.esetStatus ?? '').toLowerCase() !== 'active' ||
      String(e.activityWatchStatus ?? '').toLowerCase() !== 'installed' ||
      !e.windowsKey
  );

  const summaryRows = [
    { 'Metric': 'Total Employees', 'Count': employees.length },
    { 'Metric': 'Non-Compliant (any issue)', 'Count': flagged.length },
    { 'Metric': 'ESET Inactive', 'Count': noEset.length },
    { 'Metric': 'ActivityWatch Missing', 'Count': noAw.length },
    { 'Metric': 'Missing Windows Key', 'Count': noKey.length },
  ];

  const detailRows = flagged.map((e) => {
    const issues: string[] = [];
    if (String(e.esetStatus ?? '').toLowerCase() !== 'active') issues.push('ESET Inactive');
    if (String(e.activityWatchStatus ?? '').toLowerCase() !== 'installed') issues.push('ActivityWatch Missing');
    if (!e.windowsKey) issues.push('No Windows Key');
    return {
      'Employee ID': e.id ?? '',
      'Full Name': e.fullName ?? '',
      'Site': e.site ?? '',
      'PC Name': e.pcName || 'No PC assigned',
      'ESET Status': capitalize(e.esetStatus),
      'ActivityWatch': capitalize(e.activityWatchStatus),
      'Windows Key': e.windowsKey ? 'Present' : 'Missing',
      'Issues': issues.join('; '),
    };
  });

  buildWorkbook(
    [
      { name: 'Summary', rows: summaryRows },
      { name: 'Non-Compliant Devices', rows: detailRows },
    ],
    'Security_Compliance_Audit.xlsx'
  );

  return flagged.length
    ? `${flagged.length} non-compliant device${flagged.length > 1 ? 's' : ''} found`
    : 'All devices are compliant';
}

// ─── Report 4: Site Occupancy Report ─────────────────────────────────────────

async function generateSiteOccupancy(): Promise<string> {
  const [employees, sites] = await Promise.all([
    employeeService.list().then(asArray),
    siteService.list().then(asArray),
  ]);

  // Merge known site names from both sources so every site appears even with 0 staff
  const siteNames = Array.from(
    new Set([
      ...sites.map((s: any) => s.name ?? s.id).filter(Boolean),
      ...employees.map((e: any) => e.site).filter(Boolean),
    ])
  ) as string[];

  if (!siteNames.length) throw new Error('No site data available.');

  const total = employees.length || 1;

  const summaryRows = siteNames
    .map((site) => {
      const group = employees.filter((e: any) => e.site === site);
      const active = group.filter((e: any) => String(e.status ?? '').toLowerCase() === 'active').length;
      return {
        'Site': site,
        'Active': active,
        'Inactive': group.length - active,
        'Total': group.length,
        '% of All Staff': `${Math.round((group.length / total) * 100)}%`,
      };
    })
    .sort((a, b) => b['Total'] - a['Total']);

  const sheets: SheetDef[] = [{ name: 'Summary', rows: summaryRows }];

  for (const site of siteNames) {
    const group = employees.filter((e: any) => e.site === site);
    if (!group.length) continue;
    sheets.push({
      name: site,
      rows: group.map((e: any) => ({
        'Employee ID': e.id ?? '',
        'Full Name': e.fullName ?? '',
        'Status': capitalize(e.status),
        'Account': e.accountAssignment ?? '',
        'BO Email': e.boEmail ?? '',
        'PC Name': e.pcName ?? '',
      })),
    });
  }

  buildWorkbook(sheets, 'Site_Occupancy_Report.xlsx');
  return `${siteNames.length} sites, ${employees.length} total employees`;
}

// ─── Report 5: Recent Terminations & Archives ────────────────────────────────

async function generateTerminationsReport(): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [logs, employees] = await Promise.all([
    auditLogService.list({ entityType: 'employee', limit: 1000 }).then(asArray),
    employeeService.list().then(asArray),
  ]);

  // All employee-related audit log entries from the last 30 days
  const recentLogs = logs.filter((log: any) => {
    if (!log.createdAt) return false;
    return new Date(log.createdAt) >= thirtyDaysAgo;
  });

  const logRows = recentLogs.map((log: any) => ({
    'Date': formatDate(log.createdAt),
    'Employee': log.entityLabel || log.details?.name || log.details?.fullName || log.entityId || 'Unknown',
    'Action': log.action ?? '',
    'Performed By': log.userEmail ?? 'System',
    'Role': log.userRole ?? '',
    'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details ?? ''),
  }));

  // Employees currently marked inactive or archived
  const inactiveEmployees = employees.filter(
    (e: any) => String(e.status ?? '').toLowerCase() === 'inactive' || e.isArchived
  );

  const inactiveRows = inactiveEmployees.map((e: any) => ({
    'Employee ID': e.id ?? '',
    'Full Name': e.fullName ?? '',
    'Status': capitalize(e.status),
    'Site': e.site ?? '',
    'Account': e.accountAssignment ?? '',
    'Archived': e.isArchived ? 'Yes' : 'No',
    'Last Updated': formatDate(e.updatedAt),
  }));

  buildWorkbook(
    [
      { name: 'Activity Log (30 Days)', rows: logRows },
      { name: 'Inactive & Archived', rows: inactiveRows },
    ],
    'Recent_Terminations_Archives.xlsx'
  );

  const parts: string[] = [];
  if (recentLogs.length) parts.push(`${recentLogs.length} log entries`);
  if (inactiveEmployees.length) parts.push(`${inactiveEmployees.length} inactive employees`);
  return parts.length ? parts.join(', ') : 'No recent termination activity found';
}

// ─── Report definitions ───────────────────────────────────────────────────────

const REPORTS = [
  {
    title: 'Employee Master List',
    desc: 'Complete database of all staff and their HR records.',
    icon: FileText,
    generate: generateEmployeeMasterList,
  },
  {
    title: 'IT Asset & License Report',
    desc: 'Detailed mapping of PCs, Windows license keys, and remote IDs.',
    icon: PieChart,
    generate: generateITAssetReport,
  },
  {
    title: 'Security Compliance Audit',
    desc: 'List of devices missing ESET or ActivityWatch software.',
    icon: ShieldAlert,
    generate: generateSecurityAudit,
  },
  {
    title: 'Site Occupancy Report',
    desc: 'Breakdown of personnel distribution across all physical sites.',
    icon: BarChart,
    generate: generateSiteOccupancy,
  },
  {
    title: 'Recent Terminations & Archives',
    desc: 'Audit trail for off-boarding activities over the last 30 days.',
    icon: Trash2,
    generate: generateTerminationsReport,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleDownload(report: (typeof REPORTS)[number]) {
    if (generating) return;
    setGenerating(report.title);
    const toastId = toast.loading(`Generating ${report.title}…`);
    try {
      const result = await report.generate();
      toast.success(result, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message ?? `Failed to generate ${report.title}`, { id: toastId });
    } finally {
      setGenerating(null);
    }
  }

  return (
    <PageLayout title="Analytical Reports">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS.map((report) => {
          const isLoading = generating === report.title;
          const isDisabled = generating !== null;

          return (
            <div
              key={report.title}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-[#F3F4F6] rounded-2xl text-[#111827] group-hover:bg-[#111827] group-hover:text-white transition-colors border border-[#E5E7EB]">
                  <report.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#6B7280]">
                  xlsx
                </span>
              </div>

              <h3 className="text-xl font-black text-[#111827] mb-2">{report.title}</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-8">{report.desc}</p>

              <button
                onClick={() => handleDownload(report)}
                disabled={isDisabled}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#111827] hover:bg-[#111827] hover:text-white transition-all shadow-sm group-hover:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isLoading ? 'Generating…' : 'Generate & Download'}
              </button>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
