import { useMemo } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer , Legend } from 'recharts';

interface SecurityAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: any[];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function SecurityAlertsModal({ isOpen, onClose, devices }: SecurityAlertsModalProps) {
  
  const alertsData = useMemo(() => {
    const alerts: any[] = [];
    devices.forEach(d => {
        if (d.esetStatus === 'inactive' || d.esetStatus === 'Inactive') {
            alerts.push({
                id: `ALT-${d.id.substring(0, 4)}-ESET`,
                asset: d.name,
                issue: 'Missing Antivirus (ESET)',
                severity: 'Critical',
                dateDetected: d.updatedAt || new Date().toISOString(),
                status: 'Active'
            });
        }
        if (d.activityWatchStatus === 'missing' || d.activityWatchStatus === 'Missing') {
            alerts.push({
                id: `ALT-${d.id.substring(0, 4)}-AW`,
                asset: d.name,
                issue: 'Missing ActivityWatch',
                severity: 'High',
                dateDetected: d.updatedAt || new Date().toISOString(),
                status: 'Active'
            });
        }
        if (!d.windowsKey) {
            alerts.push({
                id: `ALT-${d.id.substring(0, 4)}-OS`,
                asset: d.name,
                issue: 'Unlicensed Windows OS',
                severity: 'Medium',
                dateDetected: d.updatedAt || new Date().toISOString(),
                status: 'Active'
            });
        }
    });
    return alerts.sort((a, b) => new Date(b.dateDetected).getTime() - new Date(a.dateDetected).getTime());
  }, [devices]);

  const stats = useMemo(() => {
    const critical = alertsData.filter(a => a.severity === 'Critical').length;
    const high = alertsData.filter(a => a.severity === 'High').length;
    const medium = alertsData.filter(a => a.severity === 'Medium').length;
    const low = alertsData.filter(a => a.severity === 'Low').length;
    return { critical, high, medium, low };
  }, [alertsData]);

  // Mocked trend data based on severity
  const trendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let baseAlerts = Math.max(5, Math.floor(alertsData.length / 3));

    return days.map((day, i) => {
        // Slight fluctuation
        const count = Math.max(0, baseAlerts + Math.floor(Math.random() * 4 - 2));
        return {
            day,
            incidents: count
        };
    });
  }, [alertsData]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Alert ID,Asset,Issue,Severity,Date Detected,Status\n" +
      alertsData.map(a => `"${a.id}","${a.asset}","${a.issue}","${a.severity}","${formatTime(a.dateDetected)}","${a.status}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_alerts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SEVERITY_COLORS: Record<string, string> = {
      'Critical': 'bg-red-100 text-red-700',
      'High': 'bg-orange-100 text-orange-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-gray-100 text-gray-700'
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Security Alerts Monitoring"
      icon={<AlertTriangle className="w-6 h-6" />}
      redirectUrl="/assets"
      redirectLabel="Open Security Monitoring"
    >
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: 'Critical', value: stats.critical, color: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50' },
            { label: 'High', value: stats.high, color: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50' },
            { label: 'Medium', value: stats.medium, color: 'text-yellow-600', border: 'border-yellow-200', bg: 'bg-yellow-50' },
            { label: 'Low', value: stats.low, color: 'text-gray-600', border: 'border-gray-200', bg: 'bg-gray-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} p-4 rounded-xl border ${s.border} flex flex-col justify-center items-center text-center shadow-sm`}>
            <p className={`text-[0.625rem] font-black uppercase tracking-wider ${s.color}`}>{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alert Trend Chart */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-[#111827] mb-6">Security Incidents Trend (Last 7 Days)</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorIncidents)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Alerts Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#111827]">Active Security Alerts</h3>
          <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Alert ID</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Asset</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Issue</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Severity</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Date Detected</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {alertsData.map(alert => (
                <tr key={alert.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-xs font-mono text-[#4B5563]">{alert.id}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{alert.asset}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{alert.issue}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${SEVERITY_COLORS[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{formatTime(alert.dateDetected)}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-red-100 text-red-700">
                        {alert.status}
                    </span>
                  </td>
                </tr>
              ))}
              {alertsData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No active security alerts!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
