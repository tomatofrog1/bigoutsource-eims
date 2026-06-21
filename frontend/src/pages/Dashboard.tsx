import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { ChevronRight, AlertTriangle, ArrowUpRight, Clock, Laptop, MapPin, UserMinus, Users, TrendingUp, BarChart3, UserPlus, Shield, Activity, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
const TotalPersonnelModal = lazy(() => import('@/src/features/dashboard/components/modals/TotalPersonnelModal').then(m => ({ default: m.TotalPersonnelModal })));
const NewHiresModal = lazy(() => import('@/src/features/dashboard/components/modals/NewHiresModal').then(m => ({ default: m.NewHiresModal })));
const TurnoverRateModal = lazy(() => import('@/src/features/dashboard/components/modals/TurnoverRateModal').then(m => ({ default: m.TurnoverRateModal })));
const AssignedAssetsModal = lazy(() => import('@/src/features/dashboard/components/modals/AssignedAssetsModal').then(m => ({ default: m.AssignedAssetsModal })));
const WorkforceGrowthModal = lazy(() => import('@/src/features/dashboard/components/modals/WorkforceGrowthModal').then(m => ({ default: m.WorkforceGrowthModal })));
const EmployeeTurnoverModal = lazy(() => import('@/src/features/dashboard/components/modals/EmployeeTurnoverModal').then(m => ({ default: m.EmployeeTurnoverModal })));
const DepartmentDistributionModal = lazy(() => import('@/src/features/dashboard/components/modals/DepartmentDistributionModal').then(m => ({ default: m.DepartmentDistributionModal })));
const WorkArrangementModal = lazy(() => import('@/src/features/dashboard/components/modals/WorkArrangementModal').then(m => ({ default: m.WorkArrangementModal })));
const RecentHiresPipelineModal = lazy(() => import('@/src/features/dashboard/components/modals/RecentHiresPipelineModal').then(m => ({ default: m.RecentHiresPipelineModal })));
const SecurityComplianceModal = lazy(() => import('@/src/features/dashboard/components/modals/SecurityComplianceModal').then(m => ({ default: m.SecurityComplianceModal })));
const ComplianceByDeptModal = lazy(() => import('@/src/features/dashboard/components/modals/ComplianceByDeptModal').then(m => ({ default: m.ComplianceByDeptModal })));
const SecurityAlertsModal = lazy(() => import('@/src/features/dashboard/components/modals/SecurityAlertsModal').then(m => ({ default: m.SecurityAlertsModal })));
const RecentActivityLogsModal = lazy(() => import('@/src/features/dashboard/components/modals/RecentActivityLogsModal').then(m => ({ default: m.RecentActivityLogsModal })));
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRealtimeSubscription } from '@/src/hooks/useRealtimeSubscription';
import { useEmployeesQuery, useDevicesQuery, useAuditLogsQuery, useAccountsQuery } from '@/src/hooks/queries';
const GrowthChart = lazy(() => import('@/src/features/dashboard/components/DashboardCharts').then(m => ({ default: m.GrowthChart })));
const AttritionChart = lazy(() => import('@/src/features/dashboard/components/DashboardCharts').then(m => ({ default: m.AttritionChart })));
const DepartmentChart = lazy(() => import('@/src/features/dashboard/components/DashboardCharts').then(m => ({ default: m.DepartmentChart })));
const SiteChart = lazy(() => import('@/src/features/dashboard/components/DashboardCharts').then(m => ({ default: m.SiteChart })));
const ComplianceChart = lazy(() => import('@/src/features/dashboard/components/DashboardCharts').then(m => ({ default: m.ComplianceChart })));
const SecurityOverviewChart = lazy(() => import('@/src/features/dashboard/components/DashboardCharts').then(m => ({ default: m.SecurityOverviewChart })));

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return action.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const SITE_COLORS: Record<string, string> = {
  'HQ': '#6366F1',
  'Candelaria': '#3B82F6',
  'WFH': '#10B981',
  'Hybrid': '#F59E0B',
};

const CustomTooltip = ({ active, payload, label, chartType }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const dataName = entry.payload?.name || label || 'Total';
    let title = '';
    let valueLabel = 'Employees';

    if (chartType === 'growth') {
      title = `Month: ${dataName}`;
      valueLabel = 'Total Employees';
    } else if (chartType === 'department') {
      title = `Department: ${dataName}`;
      valueLabel = 'Assigned Personnel';
    } else if (chartType === 'site') {
      title = `Office / Site: ${dataName}`;
      valueLabel = 'Total Count';
    } else if (chartType === 'compliance') {
      title = `Status: ${dataName}`;
      valueLabel = 'Devices';
    } else if (chartType === 'attrition') {
      title = `Month: ${dataName}`;
      valueLabel = 'Count';
    } else if (chartType === 'complianceDept') {
      title = `Department: ${dataName}`;
      valueLabel = 'Count';
    } else {
      title = `${dataName}`;
    }

    return (
      <div className="bg-white p-3 border border-[#E5E7EB] rounded-xl shadow-lg shadow-[#11182714] min-w-[140px]">
        <p className="text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF] mb-2 border-b border-[#F3F4F6] pb-2">{title}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill || '#111827' }} />
          <span className="text-xs font-bold text-[#4B5563]">{valueLabel}:</span>
          <span className="text-sm font-black text-[#111827]">{entry.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { isDark } = useTheme();
  const { can } = useAuth();
  const canViewEmployees = can('employees.view');
  const canViewAssets = can('assets.view');
  const canViewAuditLogs = can('auditlogs.view');
  const canViewDepartments = can('departments.view');
  const [employees, setEmployees] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [accounts, setAccounts] = useState<any[]>([]);

  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const [deptFilterType, setDeptFilterType] = useState<'internal' | 'external'>('internal');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'hr' | 'it' | 'audit'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useRealtimeSubscription({ table: 'employees', onChange: () => setRefreshTrigger(prev => prev + 1) });
  useRealtimeSubscription({ table: 'audit_logs', onChange: () => setRefreshTrigger(prev => prev + 1) });
  useRealtimeSubscription({ table: 'accounts', onChange: () => setRefreshTrigger(prev => prev + 1) });

  const { data: fetchedEmployees = [], isLoading: isEmployeesLoading } = useEmployeesQuery({ refreshTrigger });
  const { data: fetchedDevices = [], isLoading: isDevicesLoading } = useDevicesQuery({ refreshTrigger });
  const { data: fetchedLogs = [], isLoading: isLogsLoading } = useAuditLogsQuery({ limit: 8, refreshTrigger });
  const { data: fetchedAccounts = [], isLoading: isAccountsLoading } = useAccountsQuery({ refreshTrigger });

  useEffect(() => {
    setEmployees(fetchedEmployees.filter((emp: any) => !emp.isArchived && !emp.is_archived));
    setEmployeesLoading(isEmployeesLoading);
  }, [fetchedEmployees, isEmployeesLoading]);

  useEffect(() => {
    setDevices(fetchedDevices);
    setDevicesLoading(isDevicesLoading);
  }, [fetchedDevices, isDevicesLoading]);

  useEffect(() => {
    setLogs(fetchedLogs);
    setLogsLoading(isLogsLoading);
  }, [fetchedLogs, isLogsLoading]);

  useEffect(() => {
    setAccounts(fetchedAccounts);
    setAccountsLoading(isAccountsLoading);
  }, [fetchedAccounts, isAccountsLoading]);

  const turnoverStats = useMemo(() => {
    const active = employees.filter(e => e.status === 'active').length;
    const inactiveList = employees.filter(e => {
      const status = String(e.status || '').toLowerCase();
      return status === 'inactive' || status === 'terminated' || status === 'offboarding';
    });
    const inactive = inactiveList.length;
    const rate = active + inactive > 0 ? ((inactive / (active + inactive)) * 100).toFixed(2) : '0.00';
    return { inactive, rate, inactiveList };
  }, [employees]);

  const recentHires = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return employees
      .filter(emp => {
        const dateStr = emp.createdAt || emp.created_at;
        return dateStr && new Date(dateStr) >= thirtyDaysAgo;
      })
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || a.created_at).getTime();
        const bDate = new Date(b.createdAt || b.created_at).getTime();
        return bDate - aDate;
      })
      .slice(0, 4);
  }, [employees]);

  const stats = useMemo(() => {
    const assigned = devices.filter((device) => device.status === 'assigned').length;

    return [
      {
        label: 'Total Personnel',
        value: employees.length,
        icon: Users,
        color: 'text-[#111827]',
        reportData: employees,
        viewAllLink: '/directory',
        description: 'Comprehensive list of all employees in the directory.',
        insights: [
          { label: 'Active', value: employees.filter(e => e.status === 'active').length, colorClass: 'text-green-600' },
          { label: 'Inactive', value: employees.filter(e => e.status !== 'active').length, colorClass: 'text-gray-500' },
          { label: 'HQ Staff', value: employees.filter(e => e.site === 'HQ').length, colorClass: 'text-indigo-600' },
          { label: 'Candelaria Staff', value: employees.filter(e => e.site === 'Candelaria').length, colorClass: 'text-blue-600' }
        ],
        reportColumns: [
          { key: 'fullName', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'department', label: 'Department', render: (_: any, row: any) => row.accountAssignment || row.account || 'Unassigned' },
          { key: 'site', label: 'Site' },
          {
            key: 'status', label: 'Status', render: (val: any) => (
              <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${val === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{val}</span>
            )
          }
        ]
      },
      {
        label: 'New Hires (30d)',
        value: recentHires.length,
        icon: UserPlus,
        color: 'text-green-600',
        reportData: recentHires,
        viewAllLink: '/reports',
        description: 'Employees onboarded in the last 30 days.',
        insights: [
          { label: 'Total Hires', value: recentHires.length, colorClass: 'text-green-600' },
          { label: 'This Week', value: recentHires.filter(e => new Date(e.createdAt || e.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, colorClass: 'text-blue-600' }
        ],
        reportColumns: [
          { key: 'fullName', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'department', label: 'Department', render: (_: any, row: any) => row.accountAssignment || row.account || 'Unassigned' },
          { key: 'createdAt', label: 'Joined Date', render: (val: any, row: any) => formatTime(val || row.created_at) }
        ]
      },
      {
        label: 'Turnover Rate',
        value: `${turnoverStats.rate}%`,
        icon: UserMinus,
        color: 'text-orange-600',
        reportData: turnoverStats.inactiveList || [],
        viewAllLink: '/reports',
        description: 'Employees who have recently separated from the company.',
        insights: [
          { label: 'Turnover Rate', value: `${turnoverStats.rate}%`, colorClass: 'text-orange-600' },
          { label: 'Separated', value: (turnoverStats.inactiveList || []).length, colorClass: 'text-red-600' }
        ],
        reportColumns: [
          { key: 'fullName', label: 'Name' },
          { key: 'department', label: 'Department', render: (_: any, row: any) => row.accountAssignment || row.account || 'Unassigned' },
          {
            key: 'status', label: 'Status', render: (val: any) => (
              <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-red-100 text-red-700`}>{val}</span>
            )
          },
          { key: 'resignationDate', label: 'Separation Date', render: (val: any, row: any) => formatTime(val || row.resignation_date) }
        ]
      },
      {
        label: 'Assigned Assets',
        value: assigned,
        icon: Laptop,
        color: 'text-blue-600',
        reportData: devices.filter(d => d.status === 'assigned'),
        viewAllLink: '/assets',
        description: 'Hardware devices currently assigned to active personnel.',
        insights: [
          { label: 'Total Assigned', value: assigned, colorClass: 'text-blue-600' },
          { label: 'Available', value: devices.filter(d => d.status === 'available').length, colorClass: 'text-green-600' },
          { label: 'Under Repair', value: devices.filter(d => d.status === 'maintenance' || d.status === 'repair').length, colorClass: 'text-orange-600' }
        ],
        reportColumns: [
          { key: 'name', label: 'Device Name' },
          { key: 'type', label: 'Type' },
          { key: 'serialNumber', label: 'Serial Number' },
          {
            key: 'assignedTo', label: 'Assigned To', render: (_: any, row: any) => {
              const emp = employees.find(e => e.id === row.userId);
              return emp ? emp.fullName : 'Unknown';
            }
          },
          {
            key: 'status', label: 'Status', render: (val: any) => (
              <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-blue-100 text-blue-700`}>{val}</span>
            )
          }
        ]
      },
    ];
  }, [employees, devices, turnoverStats, recentHires]);

  const departmentDistribution = useMemo(() => {
    const targetAccounts = new Set(
      accounts
        .filter((acc) => (acc.accountType || acc.account_type) === deptFilterType)
        .map((acc) => acc.name)
    );

    const counts = new Map<string, number>();
    employees.forEach((emp) => {
      const empAccount = emp.accountAssignment || emp.account;
      if (emp.status === 'active' && empAccount && targetAccounts.has(empAccount)) {
        counts.set(empAccount, (counts.get(empAccount) || 0) + 1);
      }
    });

    const dist = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return dist;
  }, [employees, accounts, deptFilterType]);

  const securityCompliance = useMemo(() => {
    let fullyCompliant = 0;
    let missingEset = 0;
    let missingActivityWatch = 0;
    let unlicensed = 0;

    devices.forEach((device) => {
      const isMissingEset = device.esetStatus === 'inactive' || device.esetStatus === 'Inactive';
      const isMissingAW = device.activityWatchStatus === 'missing' || device.activityWatchStatus === 'Missing';
      const isUnlicensed = !device.windowsKey;

      if (!isMissingEset && !isMissingAW && !isUnlicensed) {
        fullyCompliant++;
      } else {
        if (isMissingEset) missingEset++;
        if (isMissingAW) missingActivityWatch++;
        if (isUnlicensed) unlicensed++;
      }
    });

    const results = [];
    if (fullyCompliant > 0) results.push({ name: 'Fully Compliant', count: fullyCompliant, color: '#10B981' });
    if (missingEset > 0) results.push({ name: 'Missing ESET', count: missingEset, color: '#EF4444' });
    if (missingActivityWatch > 0) results.push({ name: 'Missing Activity Watch', count: missingActivityWatch, color: '#F59E0B' });
    if (unlicensed > 0) results.push({ name: 'Unlicensed OS', count: unlicensed, color: '#FCD34D' });

    return results;
  }, [devices]);

  const complianceByDepartment = useMemo(() => {
    const deptStats = new Map();
    accounts.forEach(acc => {
      deptStats.set(acc.name, { Compliant: 0, NonCompliant: 0 });
    });

    devices.forEach(device => {
      if (!device.userId) return;
      const emp = employees.find(e => e.id === device.userId);
      if (!emp) return;
      const dept = emp.accountAssignment || emp.account;
      if (!dept) return;

      const isMissingEset = device.esetStatus === 'inactive' || device.esetStatus === 'Inactive';
      const isMissingAW = device.activityWatchStatus === 'missing' || device.activityWatchStatus === 'Missing';
      const isUnlicensed = !device.windowsKey;

      const isCompliant = !isMissingEset && !isMissingAW && !isUnlicensed;
      if (!deptStats.has(dept)) {
        deptStats.set(dept, { Compliant: 0, NonCompliant: 0 });
      }

      const stats = deptStats.get(dept);
      if (isCompliant) stats.Compliant++;
      else stats.NonCompliant++;
    });

    return Array.from(deptStats.entries())
      .map(([name, stats]) => ({
        name,
        Compliant: stats.Compliant,
        NonCompliant: stats.NonCompliant,
        total: stats.Compliant + stats.NonCompliant
      }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [devices, employees, accounts]);

  const attritionTimeline = useMemo(() => {
    const months = new Map();
    employees.forEach(emp => {
      if (emp.createdAt || emp.created_at) {
        const d = new Date(emp.createdAt || emp.created_at);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!months.has(key)) months.set(key, { month: key, timestamp: d.getTime(), hires: 0, separations: 0 });
        months.get(key).hires++;
      }
      if (emp.resignationDate || emp.resignation_date) {
        const d = new Date(emp.resignationDate || emp.resignation_date);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!months.has(key)) months.set(key, { month: key, timestamp: d.getTime(), hires: 0, separations: 0 });
        months.get(key).separations++;
      }
    });

    return Array.from(months.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-6);
  }, [employees]);

  const growthTrend = useMemo(() => {
    const months = new Map<string, number>();
    const sortedEmployees = [...employees]
      .filter(e => e.createdAt || e.created_at)
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || a.created_at).getTime();
        const bDate = new Date(b.createdAt || b.created_at).getTime();
        return aDate - bDate;
      });

    let cumulative = 0;
    sortedEmployees.forEach(emp => {
      const date = new Date(emp.createdAt || emp.created_at);
      const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
      cumulative++;
      months.set(monthYear, cumulative);
    });

    let trend = Array.from(months.entries()).map(([month, count]) => ({ month, name: month, count })).slice(-6);
    return trend;
  }, [employees]);

  const siteDistribution = useMemo(() => {
    // ... existing siteDistribution ... (wait, I need to be careful with replace)
    const ORDER = ['HQ', 'Candelaria', 'WFH', 'Hybrid'];
    const counts = new Map<string, number>();

    // Pre-initialize standard sites to ensure they always show up
    ORDER.forEach(site => counts.set(site, 0));

    employees.forEach((employee) => {
      if (employee.status === 'active') {
        let siteName = employee.site || 'Unassigned';
        if (siteName === 'HQ') siteName = 'HQ';
        counts.set(siteName, (counts.get(siteName) || 0) + 1);
      }
    });
    let dist = Array.from(counts.entries()).map(([site, count]) => ({ site, name: site, count }));

    dist.sort((a, b) => {
      let indexA = ORDER.indexOf(a.site);
      let indexB = ORDER.indexOf(b.site);
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
    });

    return dist;
  }, [employees]);

  const securityAlerts = useMemo(
    () => [
      {
        label: 'Inactive ESET',
        value: devices.filter((device) => device.esetStatus === 'inactive' || device.esetStatus === 'Inactive').length,
        color: '#DC2626',
        bg: 'rgba(220, 38, 38, 0.15)',
      },
      {
        label: 'Missing ActivityWatch',
        value: devices.filter((device) => device.activityWatchStatus === 'missing' || device.activityWatchStatus === 'Missing').length,
        color: '#EA580C',
        bg: 'rgba(234, 88, 12, 0.15)',
      },
      {
        label: 'Unlicensed Windows',
        value: devices.filter((device) => !device.windowsKey).length,
        color: '#CA8A04',
        bg: 'rgba(202, 138, 4, 0.15)',
      },
    ],
    [devices]
  );

  const totalPersonnel = employees.length;

  return (
    <PageLayout title="System Overview">
      {/* Tabs */}
      <div className="mb-8 overflow-x-auto hide-scrollbar pb-2">
        <div className="inline-flex items-center p-1.5 bg-[#F3F4F6]/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-[#E5E7EB]/50 dark:border-slate-700/50 shadow-inner">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'hr', label: 'HR Analytics', icon: Users },
            { id: 'it', label: 'IT & Security', icon: Shield },
            { id: 'audit', label: 'Audit Logs', icon: Clock }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all whitespace-nowrap outline-none rounded-xl group ${
                  isActive
                    ? 'text-[#6366F1] dark:text-indigo-400'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDashboardTabPill"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]/50 dark:border-slate-600/50"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-8">
              {/* Top Stat Cards */}
              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading || devicesLoading ? (
                  <motion.div key="skeleton-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-9 h-9 bg-gray-200 rounded-xl" />
                          <div className="w-12 h-4 bg-gray-200 rounded" />
                        </div>
                        <div className="w-24 h-3 bg-gray-200 rounded mb-2" />
                        <div className="w-16 h-8 bg-gray-200 rounded" />
                      </div>
                    ))}
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                      <motion.button
                        key={stat.label}
                        onClick={() => setActiveModal(stat.label)}
                        whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
                        className="block group outline-none text-left w-full"
                      >
                        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm group-hover:shadow-xl transition-all duration-300 ease-out cursor-pointer h-full">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827] transition-colors">
                              <stat.icon className="w-5 h-5" />
                            </div>

                            <div className={`flex items-center gap-1 text-[0.625rem] font-bold uppercase ${stat.color}`}>
                              Live
                              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                          </div>
                          <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider group-hover:text-[#4B5563] transition-colors">{stat.label}</p>
                          <p className="text-3xl font-black text-[#111827] mt-1 transition-colors">{stat.value}</p>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait" initial={false}>
                  {employeesLoading ? (
                    <motion.div key="skeleton-growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col lg:col-span-2">
                      <div className="w-48 h-6 bg-slate-200 rounded-full mb-8" />
                      <div className="flex-1 min-h-[300px] border-b border-l border-slate-100 relative">
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-1/4" />
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-2/4" />
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-3/4" />
                      </div>
                      <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                    </motion.div>
                  ) : (
                    <motion.div key="content-growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Workforce Growth Trend'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col lg:col-span-2 cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                      <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <TrendingUp className="w-5 h-5 text-[#9CA3AF]" />
                        Workforce Growth Trend
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                      <div className="flex-1 min-h-[300px]">
                        {growthTrend.length > 0 ? (
                        <Suspense fallback={<div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">Loading chart...</div>}>
                          <GrowthChart data={growthTrend} CustomTooltip={CustomTooltip} isDark={isDark} />
                        </Suspense>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No growth data available.</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait" initial={false}>
                  {employeesLoading ? (
                    <motion.div key="skeleton-hires" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col lg:col-span-1">
                      <div className="w-56 h-6 bg-slate-200 rounded-full mb-6" />
                      <div className="flex-1 space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="w-32 h-3 bg-slate-200 rounded-full" />
                              <div className="w-24 h-2 bg-slate-100 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                    </motion.div>
                  ) : (
                    <motion.div key="content-hires" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Recent Hires Pipeline'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col lg:col-span-1 cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                      <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <UserPlus className="w-5 h-5 text-[#9CA3AF]" />
                        Recent Hires Pipeline
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                      <div className="flex-1 space-y-3">
                        {recentHires.length ? (
                          recentHires.map((emp) => (
                            <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 shadow-sm text-xs font-black text-[#111827]">
                                  {(emp.fullName || 'UN').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#111827] truncate">{emp.fullName || 'Unnamed Employee'}</p>
                                  <p className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] truncate mt-0.5">{emp.department || 'Unassigned Dept'}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-xs font-bold text-[#111827]">{formatTime(emp.createdAt || emp.created_at)}</p>
                                <p className="text-[0.5625rem] font-black uppercase text-[#10B981] tracking-wider mt-1 bg-green-50 px-2 py-0.5 rounded-full inline-block">Joined</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF]">
                            <Users className="w-8 h-8 mb-3 opacity-20" />
                            <p className="text-sm font-bold">No recent hires in the last 30 days.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'hr' && (
            <motion.div key="hr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading || accountsLoading ? (
                  <motion.div key="skeleton-dept" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-56 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 min-h-[300px] flex flex-col justify-between py-4 border-l border-slate-100">
                      {[80, 60, 40, 90, 50].map((w, i) => (
                        <div key={i} className="h-8 bg-slate-100 rounded-r-md" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-dept" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Department Distribution'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <BarChart3 className="w-5 h-5 text-[#9CA3AF]" />
                        Department Distribution
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                      <div className="flex items-center bg-[#F3F4F6] p-1 rounded-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeptFilterType('internal');
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${deptFilterType === 'internal' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
                        >
                          Internal
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeptFilterType('external');
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${deptFilterType === 'external' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
                        >
                          External
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[300px] relative">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={deptFilterType}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0"
                        >
                          {departmentDistribution.length > 0 ? (
                            <Suspense fallback={<div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">Loading chart...</div>}>
                              <DepartmentChart data={departmentDistribution} CustomTooltip={CustomTooltip} COLORS={COLORS} />
                            </Suspense>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No data available.</div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading ? (
                  <motion.div key="skeleton-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-40 h-6 bg-slate-200 rounded-full mb-6" />
                    <div className="flex-1 min-h-[300px] flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border-[1.5rem] border-slate-100" />
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Work Arrangement'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <MapPin className="w-5 h-5 text-[#9CA3AF]" />
                      Work Arrangement
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                      {siteDistribution.length > 0 ? (
                        <>
                          <Suspense fallback={<div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">Loading chart...</div>}>
                            <SiteChart data={siteDistribution} CustomTooltip={CustomTooltip} SITE_COLORS={SITE_COLORS} />
                          </Suspense>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            <span className="text-3xl font-black text-[#111827]">{totalPersonnel}</span>
                            <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">Total</span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No site data available.</div>
                      )}
                    </div>
                    {siteDistribution.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-[#F3F4F6]">
                        {siteDistribution.map((entry, index) => (
                          <div key={entry.site} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SITE_COLORS[entry.site] || COLORS[index % COLORS.length] }} />
                            <span className="text-xs font-bold text-[#4B5563] truncate">{entry.site}</span>
                            <span className="text-sm font-black text-[#111827] ml-auto">{entry.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading ? (
                  <motion.div key="skeleton-attrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col xl:col-span-1">
                    <div className="w-48 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 min-h-[300px] border-b border-l border-slate-100 relative">
                      <div className="absolute w-full h-[1px] bg-slate-50 bottom-1/4" />
                      <div className="absolute w-full h-[1px] bg-slate-50 bottom-2/4" />
                      <div className="absolute w-full h-[1px] bg-slate-50 bottom-3/4" />
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-attrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Employee Turnover'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col xl:col-span-1 cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <Activity className="w-5 h-5 text-[#9CA3AF]" />
                      Employee Turnover
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                    <div className="flex-1 min-h-[300px]">
                      {attritionTimeline.length > 0 ? (
                        <Suspense fallback={<div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">Loading chart...</div>}>
                          <AttritionChart data={attritionTimeline} CustomTooltip={CustomTooltip} isDark={isDark} />
                        </Suspense>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No turnover data available.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'it' && (
            <motion.div key="it" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {devicesLoading ? (
                  <motion.div key="skeleton-sec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-48 h-6 bg-slate-200 rounded-full mb-6" />
                    <div className="flex-1 min-h-[300px] flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full border-[2rem] border-slate-100" />
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-sec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Security Compliance'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <Shield className="w-5 h-5 text-[#9CA3AF]" />
                      Security Compliance
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                    <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                      {securityCompliance.length > 0 ? (
                        <Suspense fallback={<div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">Loading chart...</div>}>
                          <SecurityOverviewChart data={securityCompliance} CustomTooltip={CustomTooltip} />
                        </Suspense>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No compliance data.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {employeesLoading || devicesLoading ? (
                  <motion.div key="skeleton-dept-comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col xl:col-span-1">
                    <div className="w-56 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 min-h-[300px] flex items-end justify-between gap-4 border-b border-slate-100 pb-2">
                      {[60, 80, 40, 100, 70, 50].map((h, i) => (
                        <div key={i} className="w-full bg-slate-100 rounded-t-md" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-dept-comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Compliance by Department'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col xl:col-span-1 cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <FileCheck className="w-5 h-5 text-[#9CA3AF]" />
                      Compliance by Department
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                    <div className="flex-1 min-h-[300px]">
                      {complianceByDepartment.length > 0 ? (
                        <Suspense fallback={<div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">Loading chart...</div>}>
                          <ComplianceChart data={complianceByDepartment} CustomTooltip={CustomTooltip} isDark={isDark} />
                        </Suspense>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No data available.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {devicesLoading ? (
                  <motion.div key="skeleton-alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-40 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-xl" />
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Security Alerts'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <AlertTriangle className="w-5 h-5 text-[#9CA3AF]" />
                      Security Alerts
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                    <div className="flex-1 space-y-4">
                      {securityAlerts.map((alert) => (
                        <div key={alert.label} className="flex items-center justify-between p-4 rounded-xl border transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: alert.bg }}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: alert.color }}>
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[0.625rem] font-black uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{alert.label}</p>
                              <p className="text-lg font-black" style={{ color: alert.color }}>{alert.value} Devices</p>
                            </div>
                          </div>
                          {canViewAssets && (
                            <Link to="/assets" className="text-[0.625rem] font-black uppercase hover:underline px-2 py-1 rounded transition-colors" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>Fix</Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {logsLoading ? (
                  <motion.div key="skeleton-logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative flex flex-col">
                    <div className="w-48 h-6 bg-slate-200 rounded-full mb-8" />
                    <div className="flex-1 space-y-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="w-2 h-2 rounded-full bg-slate-200 mt-1.5 shrink-0" />
                          <div className="space-y-2 flex-1">
                            <div className="w-48 h-3 bg-slate-200 rounded-full" />
                            <div className="w-32 h-2 bg-slate-100 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
                  </motion.div>
                ) : (
                  <motion.div key="content-logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 30 } }} onClick={(e) => { e.stopPropagation(); setActiveModal('Recent Activity Logs'); }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:shadow-xl transition-[box-shadow,border-color] duration-300 ease-out group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    <Clock className="w-5 h-5 text-[#9CA3AF]" />
                        Recent Activity Logs
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>
                      {canViewAuditLogs && (
                        <Link to="/logs" className="text-xs font-black uppercase text-[#2563EB] hover:text-[#1D4ED8] hover:underline">
                          View All
                        </Link>
                      )}
                    </div>
                    <div className="flex-1 relative border-l-2 border-[#F3F4F6] ml-3 space-y-6 pb-2 mt-2">
                      {logs.length ? (
                        logs.slice(0, 10).map((log) => (
                          <div key={log.id} className="relative pl-6">
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#6366F1] shadow-sm" />
                            <div className="flex items-center gap-4 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all">
                              <div className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 shadow-sm">
                                <span className="text-xs font-black text-[#6366F1]">
                                  {(log.userEmail || 'SY').substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#111827] mb-0.5 truncate">
                                  {log.userEmail || 'System'}
                                  <span className="font-medium text-[#6B7280] ml-1.5">
                                    {actionLabel(log.action).toLowerCase()}
                                  </span>
                                </p>
                                <p className="text-[0.6875rem] text-[#4B5563] font-medium truncate">
                                  {log.details?.fullName || log.details?.employeeNumber || log.entityType}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[0.625rem] text-[#6B7280] font-black uppercase tracking-wider bg-white px-2 py-1 rounded-md border border-[#E5E7EB] shadow-sm">
                                  {formatTime(log.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm font-bold text-[#9CA3AF] pl-6 py-2">No audit activity yet.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Suspense fallback={null}>
        <TotalPersonnelModal isOpen={activeModal === 'Total Personnel'} onClose={() => setActiveModal(null)} employees={employees} />
        <NewHiresModal isOpen={activeModal === 'New Hires (30d)'} onClose={() => setActiveModal(null)} recentHires={recentHires} />
        <TurnoverRateModal isOpen={activeModal === 'Turnover Rate'} onClose={() => setActiveModal(null)} employees={employees} turnoverRate={turnoverStats.rate} inactiveEmployees={turnoverStats.inactiveList || []} attritionTimeline={attritionTimeline} />
        <AssignedAssetsModal isOpen={activeModal === 'Assigned Assets'} onClose={() => setActiveModal(null)} devices={devices} employees={employees} />

        <WorkforceGrowthModal isOpen={activeModal === 'Workforce Growth Trend'} onClose={() => setActiveModal(null)} employees={employees} />
        <EmployeeTurnoverModal isOpen={activeModal === 'Employee Turnover'} onClose={() => setActiveModal(null)} inactiveEmployees={turnoverStats.inactiveList || []} attritionTimeline={attritionTimeline} />

        <DepartmentDistributionModal isOpen={activeModal === 'Department Distribution'} onClose={() => setActiveModal(null)} employees={employees} />
        <WorkArrangementModal isOpen={activeModal === 'Work Arrangement'} onClose={() => setActiveModal(null)} employees={employees} />
        <RecentHiresPipelineModal isOpen={activeModal === 'Recent Hires Pipeline'} onClose={() => setActiveModal(null)} recentHires={recentHires} />

        <SecurityComplianceModal isOpen={activeModal === 'Security Compliance'} onClose={() => setActiveModal(null)} devices={devices} employees={employees} />
        <ComplianceByDeptModal isOpen={activeModal === 'Compliance by Department'} onClose={() => setActiveModal(null)} complianceByDepartment={complianceByDepartment} />
        <SecurityAlertsModal isOpen={activeModal === 'Security Alerts'} onClose={() => setActiveModal(null)} devices={devices} />

        <RecentActivityLogsModal isOpen={activeModal === 'Recent Activity Logs'} onClose={() => setActiveModal(null)} logs={logs} />
      </Suspense>
    </PageLayout>
  );
}
