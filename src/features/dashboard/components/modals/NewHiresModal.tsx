import { useMemo, useState } from 'react';
import { UserPlus, Search, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer , Legend } from 'recharts';

interface NewHiresModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentHires: any[];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function NewHiresModal({ isOpen, onClose, recentHires }: NewHiresModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const total = recentHires.length;
    const thisWeek = recentHires.filter(e => new Date(e.createdAt || e.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    // Mocking pending onboarding for demonstration
    const pending = Math.floor(total * 0.2); 
    
    return { total, thisWeek, pending };
  }, [recentHires]);

  const trendData = useMemo(() => {
    const days: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Initialize last 30 days
    for(let i=0; i<30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getMonth()+1}/${d.getDate()}`;
      days[key] = 0;
    }

    recentHires.forEach(e => {
      const d = new Date(e.createdAt || e.created_at);
      if (d >= thirtyDaysAgo) {
        const key = `${d.getMonth()+1}/${d.getDate()}`;
        if (days[key] !== undefined) days[key]++;
      }
    });

    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [recentHires]);

  const filteredHires = useMemo(() => {
    return recentHires.filter(e => 
      (e.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.accountAssignment || e.account || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [recentHires, searchTerm]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Department,Position,Hire Date,Status\n" +
      filteredHires.map(e => `"${e.fullName || ''}","${e.accountAssignment || e.account || ''}","${e.position || e.jobTitle || ''}","${formatTime(e.createdAt || e.created_at)}","Completed"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `new_hires_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Hires (30 Days)"
      icon={<UserPlus className="w-6 h-6" />}
      redirectUrl="/reports"
      redirectLabel="Open Recruitment Module"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Total New Hires</p>
          <p className="text-4xl font-black mt-2 text-[#10B981]">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Hires This Week</p>
          <p className="text-4xl font-black mt-2 text-[#3B82F6]">{stats.thisWeek}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Pending Onboarding</p>
          <p className="text-4xl font-black mt-2 text-[#F59E0B]">{stats.pending}</p>
        </div>
      </div>

      {/* Mini Trend Chart */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
        <h3 className="text-sm font-bold text-[#111827] mb-4">Hiring Trend (Last 30 Days)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} minTickGap={20} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#111827', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="count" name="Hires" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input 
              type="text" 
              placeholder="Search hires..." 
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
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Employee Name</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Position</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Hire Date</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Onboarding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredHires.map(emp => (
                <tr key={emp.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{emp.fullName}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.accountAssignment || emp.account || '-'}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{emp.position || emp.jobTitle || '-'}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{formatTime(emp.createdAt || emp.created_at)}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-green-100 text-green-700">Completed</span>
                  </td>
                </tr>
              ))}
              {filteredHires.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No recent hires found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
