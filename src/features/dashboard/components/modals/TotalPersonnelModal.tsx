import { useMemo, useState } from 'react';
import { Users, Search, Download, Filter } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { CustomSelect } from '@/src/common/components/CustomSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface TotalPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function TotalPersonnelModal({ isOpen, onClose, employees }: TotalPersonnelModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Summaries
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => e.status !== 'active').length;
    const probationary = employees.filter(e => e.employmentType === 'Probationary' || e.employment_type === 'Probationary').length;
    const contractual = employees.filter(e => e.employmentType === 'Contractual' || e.employment_type === 'Contractual').length;
    
    return { total, active, inactive, probationary, contractual };
  }, [employees]);

  // Breakdowns
  const deptBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => {
      const dept = e.accountAssignment || e.account || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [employees]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => {
      const type = e.employmentType || e.employment_type || 'Regular';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const siteBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => {
      const site = e.site || 'Unassigned';
      counts[site] = (counts[site] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  // Table Data
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = (e.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (e.employeeNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const dept = e.accountAssignment || e.account || 'Unassigned';
      const matchesDept = !deptFilter || dept === deptFilter;
      const matchesStatus = !statusFilter || e.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, deptFilter, statusFilter]);

  const uniqueDepts = useMemo(() => Array.from(new Set(employees.map(e => e.accountAssignment || e.account || 'Unassigned'))), [employees]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(employees.map(e => e.status || 'unknown'))), [employees]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Employee ID,Name,Department,Position,Status\n" +
      filteredEmployees.map(e => {
        return `"${e.employeeNumber || ''}","${e.fullName || ''}","${e.accountAssignment || e.account || ''}","${e.position || e.jobTitle || ''}","${e.status || ''}"`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `total_personnel_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Total Personnel Overview"
      icon={<Users className="w-6 h-6" />}
      redirectUrl="/directory"
      redirectLabel="View Employee Directory"
    >
      {/* Summary Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-[#111827]' },
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Inactive', value: stats.inactive, color: 'text-gray-500' },
          { label: 'Probationary', value: stats.probationary, color: 'text-blue-600' },
          { label: 'Contractual', value: stats.contractual, color: 'text-orange-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
            <p className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Workforce Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#6B7280] mb-4 text-center">By Department</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                  {deptBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#6B7280] mb-4 text-center">By Employment Type</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeBreakdown} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#6B7280] mb-4 text-center">By Work Arrangement</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={siteBreakdown} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                  {siteBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
               <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
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
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <CustomSelect
              value={deptFilter}
              onChange={setDeptFilter}
              options={[{ value: '', label: 'All Departments' }, ...uniqueDepts.map(d => ({ value: d, label: d }))]}
              className="w-full sm:w-40"
            />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: '', label: 'All Statuses' }, ...uniqueStatuses.map(s => ({ value: s, label: s }))]}
              className="w-full sm:w-40"
            />
            <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">ID</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Name</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Position</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredEmployees.slice(0, 50).map(emp => (
                <tr key={emp.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.employeeNumber || '-'}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{emp.fullName}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.accountAssignment || emp.account || '-'}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.position || emp.jobTitle || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No employees found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredEmployees.length > 50 && (
          <div className="p-3 text-center text-xs text-[#6B7280] bg-[#F9FAFB] border-t border-[#F3F4F6]">
            Showing first 50 results. Use export or filters to see more.
          </div>
        )}
      </div>
    </BaseDashboardModal>
  );
}
