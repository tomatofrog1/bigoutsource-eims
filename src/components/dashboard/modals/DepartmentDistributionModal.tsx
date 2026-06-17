import { useMemo } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell , Legend } from 'recharts';

interface DepartmentDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DepartmentDistributionModal({ isOpen, onClose, employees }: DepartmentDistributionModalProps) {
  
  const deptStats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const total = activeEmployees.length;
    
    const counts: Record<string, number> = {};
    activeEmployees.forEach(e => {
      const dept = e.accountAssignment || e.account || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    const list = Object.entries(counts).map(([name, count]) => {
      return {
        name,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
        // Mock manager for now, since it might not be explicitly present
        manager: 'Assigned Manager'
      };
    }).sort((a, b) => b.count - a.count);

    return list;
  }, [employees]);

  const insights = useMemo(() => {
    if (deptStats.length === 0) return { largest: 'N/A', fastest: 'N/A' };
    const largest = deptStats[0].name;
    // Mock fastest growing as the second largest or random for demo
    const fastest = deptStats.length > 1 ? deptStats[1].name : largest;
    
    return { largest, fastest };
  }, [deptStats]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Department,Headcount,Manager,Percentage\n" +
      deptStats.map(d => `"${d.name}","${d.count}","${d.manager}","${d.percentage}%"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `department_distribution.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Department Distribution"
      icon={<BarChart3 className="w-6 h-6" />}
      redirectUrl="/departments"
      redirectLabel="Open Department Management"
    >
      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Largest Department</p>
          <p className="text-2xl font-black mt-2 text-[#3B82F6]">{insights.largest}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Fastest Growing Department</p>
          <p className="text-2xl font-black mt-2 text-[#10B981]">{insights.fastest}</p>
        </div>
      </div>

      {/* Department Chart */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-[#111827] mb-6">Employee Count by Department</h3>
        <div className="flex-1 min-h-[350px]">
          {deptStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#111827', fontWeight: 'bold' }} width={120} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                  {deptStats.slice(0, 10).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No department data available.</div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#111827]">Department Breakdown</h3>
          <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Headcount</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Manager</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">% of Workforce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {deptStats.map(dept => (
                <tr key={dept.name} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-4 text-sm font-bold text-[#111827]">{dept.name}</td>
                  <td className="px-6 py-4 text-sm text-[#4B5563]">{dept.count}</td>
                  <td className="px-6 py-4 text-sm text-[#4B5563]">{dept.manager}</td>
                  <td className="px-6 py-4 text-sm text-[#4B5563]">
                    <div className="flex items-center gap-2">
                        <span className="w-10">{dept.percentage}%</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                            <div className="h-full bg-[#6366F1]" style={{ width: `${dept.percentage}%` }} />
                        </div>
                    </div>
                  </td>
                </tr>
              ))}
              {deptStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No departments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
