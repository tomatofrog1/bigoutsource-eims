import { useMemo, useState } from 'react';
import { MapPin, Search, Download } from 'lucide-react';
import { useDebounce } from '@/src/hooks/useDebounce';
import { BaseDashboardModal } from './BaseDashboardModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface WorkArrangementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
}

const SITE_COLORS: Record<string, string> = {
  'HQ': '#6366F1', // On-site
  'Candelaria': '#3B82F6', // On-site
  'WFH': '#10B981', // Remote
  'Hybrid': '#F59E0B', // Hybrid
};

const DEFAULT_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function WorkArrangementModal({ isOpen, onClose, employees }: WorkArrangementModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const arrangementDistribution = useMemo(() => {
    const counts: Record<string, number> = { 'On-Site': 0, 'Remote': 0, 'Hybrid': 0, 'Unassigned': 0 };
    activeEmployees.forEach(e => {
      const site = e.site || 'Unassigned';
      if (site === 'WFH') counts['Remote']++;
      else if (site === 'Hybrid') counts['Hybrid']++;
      else if (site === 'Unassigned') counts['Unassigned']++;
      else counts['On-Site']++; // HQ, Candelaria
    });

    return Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => ({ name, count }));
  }, [activeEmployees]);

  const deptComparison = useMemo(() => {
    const depts: Record<string, { name: string, 'On-Site': number, 'Remote': number, 'Hybrid': number, 'Unassigned': number }> = {};
    activeEmployees.forEach(e => {
        const dept = e.accountAssignment || e.account || 'Unassigned';
        if (!depts[dept]) depts[dept] = { name: dept, 'On-Site': 0, 'Remote': 0, 'Hybrid': 0, 'Unassigned': 0 };
        
        const site = e.site || 'Unassigned';
        if (site === 'WFH') depts[dept]['Remote']++;
        else if (site === 'Hybrid') depts[dept]['Hybrid']++;
        else if (site === 'Unassigned') depts[dept]['Unassigned']++;
        else depts[dept]['On-Site']++;
    });

    return Object.values(depts).sort((a, b) => (b['On-Site'] + b['Remote'] + b['Hybrid']) - (a['On-Site'] + a['Remote'] + a['Hybrid'])).slice(0, 10);
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(e => 
      (e.fullName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
      (e.accountAssignment || e.account || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [activeEmployees, debouncedSearchTerm]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Employee,Department,Work Arrangement,Site\n" +
      filteredEmployees.map(e => `"${e.fullName || ''}","${e.accountAssignment || e.account || ''}","${e.site === 'WFH' ? 'Remote' : e.site === 'Hybrid' ? 'Hybrid' : 'On-Site'}","${e.site || 'Unassigned'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `work_arrangement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ARRANGEMENT_COLORS: Record<string, string> = {
      'On-Site': '#6366F1',
      'Remote': '#10B981',
      'Hybrid': '#F59E0B',
      'Unassigned': '#9CA3AF'
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Work Arrangement Distribution"
      icon={<MapPin className="w-6 h-6" />}
      redirectUrl="/directory"
      redirectLabel="View Employee Directory"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arrangement Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4 text-center">Arrangement Distribution</h3>
          <div className="flex-1 min-h-[250px]">
            {arrangementDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={arrangementDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="count">
                        {arrangementDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={ARRANGEMENT_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                   <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No data available.</div>
            )}
          </div>
        </div>

        {/* Department Comparison Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4 text-center">Arrangement by Department</h3>
          <div className="flex-1 min-h-[250px]">
            {deptComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparison} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#111827' }} width={80} />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} />
                   <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="On-Site" stackId="a" fill="#6366F1" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Hybrid" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Remote" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input 
              type="text" 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>
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
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Work Arrangement</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Site Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredEmployees.slice(0, 100).map(emp => {
                const arr = emp.site === 'WFH' ? 'Remote' : emp.site === 'Hybrid' ? 'Hybrid' : 'On-Site';
                return (
                    <tr key={emp.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-6 py-3 text-sm font-bold text-[#111827]">{emp.fullName}</td>
                    <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.accountAssignment || emp.account || '-'}</td>
                    <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${
                            arr === 'On-Site' ? 'bg-indigo-100 text-indigo-700' :
                            arr === 'Remote' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            {arr}
                        </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.site || 'Unassigned'}</td>
                    </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
