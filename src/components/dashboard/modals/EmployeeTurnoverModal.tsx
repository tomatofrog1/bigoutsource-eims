import { useMemo } from 'react';
import { Activity, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';

interface EmployeeTurnoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  inactiveEmployees: any[];
  attritionTimeline: any[];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

const COLORS = ['#EF4444', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6'];

export function EmployeeTurnoverModal({ isOpen, onClose, inactiveEmployees, attritionTimeline }: EmployeeTurnoverModalProps) {
  
  const deptComparison = useMemo(() => {
    const counts: Record<string, number> = {};
    inactiveEmployees.forEach(e => {
      const dept = e.accountAssignment || e.account || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [inactiveEmployees]);

  const topFactors = useMemo(() => {
    let resignation = 0;
    let termination = 0;
    let retirement = 0;
    let other = 0;

    inactiveEmployees.forEach(e => {
      const reason = (e.resignationReason || e.resignation_reason || '').toLowerCase();
      if (reason.includes('term') || reason.includes('fired') || reason.includes('performance')) termination++;
      else if (reason.includes('retire')) retirement++;
      else if (reason.includes('resign') || reason.includes('better')) resignation++;
      else other++;
    });

    // Make "other" into resignation if it's empty
    if (resignation === 0 && other > 0) {
        resignation = other;
        other = 0;
    }

    const data = [];
    if (resignation > 0) data.push({ name: 'Resignation', value: resignation });
    if (retirement > 0) data.push({ name: 'Retirement', value: retirement });
    if (termination > 0) data.push({ name: 'Termination', value: termination });
    if (other > 0) data.push({ name: 'Other', value: other });

    return data.sort((a, b) => b.value - a.value);
  }, [inactiveEmployees]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Employee,Department,Exit Date,Reason\n" +
      inactiveEmployees.map(e => `"${e.fullName || ''}","${e.accountAssignment || e.account || ''}","${formatTime(e.resignationDate || e.resignation_date)}","${e.resignationReason || e.resignation_reason || 'Resigned'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recent_exits_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Turnover Analytics"
      icon={<Activity className="w-6 h-6" />}
      redirectUrl="/reports"
      redirectLabel="Open Workforce Analytics"
    >
      {/* Top Contributing Factors Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topFactors.map((factor, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
            <p className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">{factor.name}</p>
            <p className={`text-2xl font-black mt-1 ${i === 0 ? 'text-[#EF4444]' : 'text-[#111827]'}`}>{factor.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnover Trend by Period */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4">Turnover Trend by Period</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attritionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip />
               <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="separations" name="Separations" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="hires" name="New Hires" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Turnover by Department */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4">Turnover by Department</h3>
          <div className="flex-1 min-h-[250px]">
            {deptComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparison} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#111827' }} width={100} />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="value" name="Separations" radius={[0, 4, 4, 0]} barSize={24}>
                        {deptComparison.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No department data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#111827]">Recent Cases</h3>
          <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Employee Name</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Exit Date</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {inactiveEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{emp.fullName}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.accountAssignment || emp.account || '-'}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{formatTime(emp.resignationDate || emp.resignation_date)}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">
                    {emp.resignationReason || emp.resignation_reason || 'Voluntary Resignation'}
                  </td>
                </tr>
              ))}
              {inactiveEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No recent exits.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
