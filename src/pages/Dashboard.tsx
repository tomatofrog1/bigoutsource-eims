import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Clock, Laptop, MapPin, UserCheck, UserMinus, Users, Building2, TrendingUp, BarChart3, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { employeeService } from '@/src/services/employeeService';
import { deviceService } from '@/src/services/deviceService';
import { auditLogService } from '@/src/services/auditLogService';
import { accountService } from '@/src/services/accountService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

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
  'San Pablo City (HQ)': '#6366F1',
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
    } else {
      title = `${dataName}`;
    }

    return (
      <div className="bg-white p-3 border border-[#E5E7EB] rounded-xl shadow-lg shadow-[#11182714] min-w-[140px]">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2 border-b border-[#F3F4F6] pb-2">{title}</p>
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [accounts, setAccounts] = useState<any[]>([]);

  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      try {
        const result = await employeeService.list();
        if (!isMounted) return;
        setEmployees(asArray(result).filter((emp: any) => !emp.isArchived && !emp.is_archived));
      } finally {
        if (isMounted) setEmployeesLoading(false);
      }
    }

    async function loadDevices() {
      try {
        const result = await deviceService.list();
        if (!isMounted) return;
        setDevices(asArray(result));
      } finally {
        if (isMounted) setDevicesLoading(false);
      }
    }

    async function loadLogs() {
      try {
        const result = await auditLogService.list({ limit: 8 });
        if (!isMounted) return;
        setLogs(asArray(result));
      } finally {
        if (isMounted) setLogsLoading(false);
      }
    }

    async function loadAccounts() {
      try {
        const result = await accountService.list();
        if (!isMounted) return;
        setAccounts(asArray(result));
      } finally {
        if (isMounted) setAccountsLoading(false);
      }
    }

    loadEmployees();
    loadDevices();
    loadLogs();
    loadAccounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const turnoverStats = useMemo(() => {
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => {
      const status = String(e.status || '').toLowerCase();
      return status === 'inactive' || status === 'terminated' || status === 'offboarding';
    }).length;
    const rate = active + inactive > 0 ? ((inactive / (active + inactive)) * 100).toFixed(2) : '0.00';
    return { inactive, rate };
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
      { label: 'Total Personnel', value: employees.length, icon: Users, color: 'text-[#111827]', link: '/directory' },
      { label: 'Assigned Assets', value: assigned, icon: Laptop, color: 'text-blue-600', link: '/assets' },
      { label: 'Turnover Rate', value: `${turnoverStats.rate}%`, icon: UserMinus, color: 'text-orange-600' },
      { label: 'New Hires (30d)', value: recentHires.length, icon: UserPlus, color: 'text-green-600' },
    ];
  }, [employees, devices, turnoverStats, recentHires]);

  const departmentDistribution = useMemo(() => {
    const internalAccounts = new Set(
      accounts
        .filter((acc) => acc.accountType === 'internal' || acc.account_type === 'internal')
        .map((acc) => acc.name)
    );

    const counts = new Map<string, number>();
    employees.forEach((emp) => {
      const empAccount = emp.accountAssignment || emp.account;
      if (emp.status === 'active' && empAccount && internalAccounts.has(empAccount)) {
        counts.set(empAccount, (counts.get(empAccount) || 0) + 1);
      }
    });

    let dist = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (dist.length === 0) {
      dist = [
        { name: 'Engineering', count: 42 },
        { name: 'Customer Support', count: 35 },
        { name: 'Operations', count: 20 },
        { name: 'Human Resources', count: 12 },
        { name: 'Finance', count: 8 }
      ];
    }

    return dist;
  }, [employees, accounts]);

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
    const ORDER = ['San Pablo City (HQ)', 'Candelaria', 'WFH', 'Hybrid'];
    const counts = new Map<string, number>();
    
    // Pre-initialize standard sites to ensure they always show up
    ORDER.forEach(site => counts.set(site, 0));

    employees.forEach((employee) => {
      if (employee.status === 'active') {
        let siteName = employee.site || 'Unassigned';
        if (siteName === 'HQ') siteName = 'San Pablo City (HQ)';
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
      <div className="space-y-8">
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
                <div key={stat.label} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827]">
                      <stat.icon className="w-5 h-5" />
                    </div>
                    {stat.link ? (
                      <Link to={stat.link} className={`flex items-center gap-1 text-[10px] font-bold uppercase ${stat.color} hover:underline`}>
                        Live
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase ${stat.color}`}>
                        Live
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-black text-[#111827] mt-1">{stat.value}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="wait" initial={false}>
            {employeesLoading ? (
              <motion.div key="skeleton-growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative">
                <div className="w-48 h-6 bg-gray-200 rounded mb-6" />
                <div className="w-full h-[300px] bg-gray-100 rounded" />
                <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
              </motion.div>
            ) : (
              <motion.div key="content-growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#9CA3AF]" />
                  Workforce Growth Trend
                </h3>
                <div className="flex-1 min-h-[300px]">
                  {growthTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
                        <RechartsTooltip content={<CustomTooltip chartType="growth" />} cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }} wrapperStyle={{ zIndex: 9999 }} />
                        <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No growth data available.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {employeesLoading || accountsLoading ? (
              <motion.div key="skeleton-dept" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative">
                <div className="w-48 h-6 bg-gray-200 rounded mb-6" />
                <div className="w-full h-[300px] bg-gray-100 rounded" />
                <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
              </motion.div>
            ) : (
              <motion.div key="content-dept" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#9CA3AF]" />
                  Department Distribution
                </h3>
                <div className="flex-1 min-h-[300px]">
                  {departmentDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentDistribution} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#111827', fontWeight: 'bold' }} width={90} />
                        <RechartsTooltip content={<CustomTooltip chartType="department" />} cursor={{ fill: '#F9FAFB' }} wrapperStyle={{ zIndex: 9999 }} />
                        <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No department data available.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Analytics Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="wait" initial={false}>
            {employeesLoading ? (
              <motion.div key="skeleton-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative">
                <div className="w-48 h-6 bg-gray-200 rounded mb-6" />
                <div className="w-full h-[250px] bg-gray-100 rounded" />
                <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
              </motion.div>
            ) : (
              <motion.div key="content-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#9CA3AF]" />
                  Work Arrangement
                </h3>
                <div className="flex-1 min-h-[250px] flex items-center justify-center relative">
                  {siteDistribution.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={siteDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="count"
                            stroke="none"
                          >
                            {siteDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SITE_COLORS[entry.site] || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip chartType="site" />} wrapperStyle={{ zIndex: 9999 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <span className="text-3xl font-black text-[#111827]">{totalPersonnel}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Total</span>
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
              <motion.div key="skeleton-hires" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative">
                <div className="w-48 h-6 bg-gray-200 rounded mb-6" />
                <div className="w-full h-[250px] bg-gray-100 rounded" />
                <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
              </motion.div>
            ) : (
              <motion.div key="content-hires" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#9CA3AF]" />
                  Recent Hires Pipeline
                </h3>
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
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280] truncate mt-0.5">{emp.department || 'Unassigned Dept'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs font-bold text-[#111827]">{formatTime(emp.createdAt || emp.created_at)}</p>
                          <p className="text-[9px] font-black uppercase text-[#10B981] tracking-wider mt-1 bg-green-50 px-2 py-0.5 rounded-full inline-block">Joined</p>
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

        {/* Row 3: Security Alerts & Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="wait" initial={false}>
            {logsLoading ? (
              <motion.div key="skeleton-logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="xl:col-span-2 bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative">
                <div className="w-48 h-6 bg-gray-200 rounded mb-6" />
                <div className="w-full h-[250px] bg-gray-100 rounded" />
                <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
              </motion.div>
            ) : (
              <motion.div key="content-logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="xl:col-span-2 bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#9CA3AF]" />
                    Recent Activity Logs
                  </h3>
                  <Link to="/logs" className="text-xs font-black uppercase text-[#2563EB] hover:text-[#1D4ED8] hover:underline">
                    View All
                  </Link>
                </div>
                <div className="flex-1 space-y-5">
                  {logs.length ? (
                    logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start gap-4">
                        <div className="w-2 h-2 rounded-full bg-[#111827] mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#111827]">
                            {log.userEmail || 'System'} <span className="font-medium text-[#6B7280]">{actionLabel(log.action).toLowerCase()}</span>
                          </p>
                          <p className="text-xs text-[#4B5563] mt-1">{log.details?.fullName || log.details?.employeeNumber || log.entityType}</p>
                          <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mt-1">{formatTime(log.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-[#9CA3AF]">No audit activity yet.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {devicesLoading ? (
              <motion.div key="skeleton-alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse relative">
                <div className="w-48 h-6 bg-gray-200 rounded mb-6" />
                <div className="w-full h-[250px] bg-gray-100 rounded" />
                <SkeletonLoadingMessage message="Preparing dashboard statistics..." />
              </motion.div>
            ) : (
              <motion.div key="content-alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#9CA3AF]" />
                  Security Alerts
                </h3>
                <div className="flex-1 space-y-4">
                  {securityAlerts.map((alert) => (
                    <div key={alert.label} className="flex items-center justify-between p-4 rounded-xl border transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: alert.bg }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: alert.color }}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{alert.label}</p>
                          <p className="text-lg font-black" style={{ color: alert.color }}>{alert.value} Devices</p>
                        </div>
                      </div>
                      <Link to="/assets" className="text-[10px] font-black uppercase hover:underline px-2 py-1 rounded transition-colors" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>Fix</Link>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}
