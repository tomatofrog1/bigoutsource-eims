import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Clock, Laptop, MapPin, UserCheck, UserMinus, Users, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { employeeService } from '@/src/services/employeeService';
import { deviceService } from '@/src/services/deviceService';
import { auditLogService } from '@/src/services/auditLogService';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return action.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Dashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      const [employeeResult, deviceResult, logResult] = await Promise.allSettled([
        employeeService.list(),
        deviceService.list(),
        auditLogService.list({ limit: 8 }),
      ]);

      if (!isMounted) return;

      setEmployees(employeeResult.status === 'fulfilled' ? asArray(employeeResult.value) : []);
      setDevices(deviceResult.status === 'fulfilled' ? asArray(deviceResult.value) : []);
      setLogs(logResult.status === 'fulfilled' ? asArray(logResult.value) : []);
      setIsLoading(false);
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const assigned = devices.filter((device) => device.status === 'assigned').length;
    const onSite = employees.filter((employee) => employee.site === 'HQ' || employee.site === 'Candelaria').length;

    return [
      { label: 'Total Personnel', value: employees.length, icon: Users },
      { label: 'On-Site Personnel', value: onSite, icon: Building2 },
      { label: 'Assigned Assets', value: assigned, icon: Laptop },
    ];
  }, [employees, devices]);

  const staffStatus = useMemo(() => {
    const active = employees.filter((employee) => String(employee.status || '').toLowerCase() === 'active').length;
    const inactive = employees.filter((employee) => {
      const status = String(employee.status || '').toLowerCase();
      return status === 'inactive' || status === 'offboarding';
    }).length;

    return {
      active,
      inactive,
    };
  }, [employees]);

  const staffStatusTotal = staffStatus.active + staffStatus.inactive;
  const staffStatusChartTotal = Math.max(staffStatusTotal, 1);

  const securityAlerts = useMemo(
    () => [
      {
        label: 'Inactive ESET',
        value: devices.filter((device) => device.esetStatus === 'inactive' || device.esetStatus === 'Inactive').length,
        color: 'text-red-600',
        bg: 'bg-red-50',
      },
      {
        label: 'Missing ActivityWatch',
        value: devices.filter((device) => device.activityWatchStatus === 'missing' || device.activityWatchStatus === 'Missing').length,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
      },
      {
        label: 'Unlicensed Windows',
        value: devices.filter((device) => !device.windowsKey).length,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
      },
    ],
    [devices]
  );

  const siteDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach((employee) => {
      counts.set(employee.site || 'Unassigned', (counts.get(employee.site || 'Unassigned') || 0) + 1);
    });
    return Array.from(counts.entries()).map(([site, count]) => ({ site, count }));
  }, [employees]);

  const totalPersonnel = Math.max(employees.length, 1);

  return (
    <PageLayout title="System Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#F3F4F6] rounded-xl text-[#111827]">
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-600">
                Live
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{isLoading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Staff Status Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#9CA3AF]" />
            Staff Status Distribution
          </h3>
          <div className="flex items-center justify-center">
            <svg width="200" height="200" viewBox="0 0 200 200" className="mb-6">
              {/* Pie Chart Background Circle */}
              <circle cx="100" cy="100" r="80" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              {/* Active segment (blue) - 80% of circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="8"
                strokeDasharray={`${(staffStatus.active / staffStatusChartTotal) * 502.65} 502.65`}
                strokeDashoffset="0"
                transform="rotate(-90 100 100)"
              />
              {/* Inactive segment (red) - 20% of circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#EF4444"
                strokeWidth="8"
                strokeDasharray={`${(staffStatus.inactive / staffStatusChartTotal) * 502.65} 502.65`}
                strokeDashoffset={`-${(staffStatus.active / staffStatusChartTotal) * 502.65}`}
                transform="rotate(-90 100 100)"
              />
              {/* Center text */}
              <text x="100" y="95" textAnchor="middle" className="text-sm font-black fill-[#111827]">
                {staffStatusTotal}
              </text>
              <text x="100" y="110" textAnchor="middle" className="text-xs fill-[#6B7280] font-bold">
                Total Staff
              </text>
            </svg>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-bold text-[#4B5563]">Active</span>
              </div>
              <span className="text-sm font-black text-[#111827]">{staffStatus.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-bold text-[#4B5563]">Inactive/Offboarding</span>
              </div>
              <span className="text-sm font-black text-[#111827]">{staffStatus.inactive}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {securityAlerts.map((alert) => (
          <div key={alert.label} className={`flex items-center justify-between p-5 rounded-2xl border border-[#E5E7EB] ${alert.bg}`}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg bg-white shadow-sm ${alert.color}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#6B7280] uppercase">{alert.label}</p>
                <p className={`text-xl font-black ${alert.color}`}>{alert.value} Devices</p>
              </div>
            </div>
            <Link to="/assets" className="text-[10px] font-black uppercase text-[#111827] hover:underline">View All</Link>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#9CA3AF]" />
            Personnel per Site
          </h3>
          <div className="space-y-6">
            {siteDistribution.length ? (
              siteDistribution.map((item) => (
                <div key={item.site} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-[#4B5563]">{item.site}</span>
                    <span className="text-[#111827] text-xs font-black">{Math.round((item.count / totalPersonnel) * 100)}% ({item.count})</span>
                  </div>
                  <div className="w-full h-3 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / totalPersonnel) * 100}%` }}
                      className="h-full bg-[#111827]"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-bold text-[#9CA3AF]">No personnel records yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#9CA3AF]" />
            Recent Activity
          </h3>
          <div className="space-y-6">
            {logs.length ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-[#F3F4F6] last:border-0 last:pb-0">
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
          <Link to="/logs" className="block text-center w-full mt-6 py-2 text-xs font-bold text-[#111827] border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] transition-colors">
            View Full Audit Logs
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
