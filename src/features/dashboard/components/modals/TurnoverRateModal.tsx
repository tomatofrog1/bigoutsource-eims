import { useMemo } from 'react';
import { UserMinus, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell , Legend } from 'recharts';

interface TurnoverRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  turnoverRate: string;
  inactiveEmployees: any[];
  attritionTimeline: any[];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

const COLORS = ['#F59E0B', '#EF4444', '#8B5CF6'];

export function TurnoverRateModal({ isOpen, onClose, employees, turnoverRate, inactiveEmployees, attritionTimeline }: TurnoverRateModalProps) {
  const stats = useMemo(() => {
    // Basic mocks for Monthly/Annual based on available data
    const currentRate = parseFloat(turnoverRate);
    const monthlyTurnover = inactiveEmployees.filter(e => {
        const d = new Date(e.resignationDate || e.resignation_date);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return d >= thirtyDaysAgo;
    }).length;
    
    // Mock Annual turnover as something slightly larger
    const annualTurnover = inactiveEmployees.filter(e => {
        const d = new Date(e.resignationDate || e.resignation_date);
        const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        return d >= yearAgo;
    }).length;

    return { currentRate, monthlyTurnover, annualTurnover };
  }, [turnoverRate, inactiveEmployees]);

  const breakdownData = useMemo(() => {
    let voluntary = 0;
    let termination = 0;
    let contractEnd = 0;

    inactiveEmployees.forEach(e => {
      const reason = (e.resignationReason || e.resignation_reason || '').toLowerCase();
      if (reason.includes('term') || reason.includes('fired')) termination++;
      else if (reason.includes('contract') || reason.includes('end')) contractEnd++;
      else voluntary++; // Default to voluntary
    });

    return [
      { name: 'Voluntary', value: voluntary },
      { name: 'Termination', value: termination },
      { name: 'End of Contract', value: contractEnd }
    ];
  }, [inactiveEmployees]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Employee,Department,Exit Date,Reason\n" +
      inactiveEmployees.map(e => `"${e.fullName || ''}","${e.accountAssignment || e.account || ''}","${formatTime(e.resignationDate || e.resignation_date)}","${e.resignationReason || e.resignation_reason || 'Resigned'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `turnover_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Turnover Rate & Separations"
      icon={<UserMinus className="w-6 h-6" />}
      redirectUrl="/reports"
      redirectLabel="View Workforce Analytics"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Current Turnover Rate</p>
          <p className="text-4xl font-black mt-2 text-[#EA580C]">{stats.currentRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Monthly Separations</p>
          <p className="text-4xl font-black mt-2 text-[#EF4444]">{stats.monthlyTurnover}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Annual Separations</p>
          <p className="text-4xl font-black mt-2 text-[#111827]">{stats.annualTurnover}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4">Turnover Trend</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attritionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="separations" name="Separations" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4">Turnover Breakdown</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#111827' }} width={100} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {breakdownData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#111827]">Recent Separations</h3>
          <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Employee</th>
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
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-gray-100 text-gray-700">
                        {emp.resignationReason || emp.resignation_reason || 'Voluntary Resignation'}
                    </span>
                  </td>
                </tr>
              ))}
              {inactiveEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No recent separations.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
