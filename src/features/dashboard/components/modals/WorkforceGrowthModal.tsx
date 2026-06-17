import { useMemo, useState } from 'react';
import { TrendingUp, Filter } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { CustomSelect } from '@/src/common/components/CustomSelect';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer , Legend } from 'recharts';

interface WorkforceGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
}

export function WorkforceGrowthModal({ isOpen, onClose, employees }: WorkforceGrowthModalProps) {
  const [period, setPeriod] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('All');

  const uniqueDepts = useMemo(() => Array.from(new Set(employees.map(e => e.accountAssignment || e.account || 'Unassigned'))), [employees]);
  
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const dept = e.accountAssignment || e.account || 'Unassigned';
      if (deptFilter && dept !== deptFilter) return false;
      if (yearFilter !== 'All' && e.createdAt) {
        const year = new Date(e.createdAt || e.created_at).getFullYear().toString();
        if (year !== yearFilter) return false;
      }
      return true;
    });
  }, [employees, deptFilter, yearFilter]);

  const uniqueYears = useMemo(() => {
    const years = new Set(employees.filter(e => e.createdAt || e.created_at).map(e => new Date(e.createdAt || e.created_at).getFullYear().toString()));
    return Array.from(years).sort().reverse();
  }, [employees]);

  const growthTrend = useMemo(() => {
    const sortedEmployees = [...filteredEmployees]
      .filter(e => e.createdAt || e.created_at)
      .sort((a, b) => new Date(a.createdAt || a.created_at).getTime() - new Date(b.createdAt || b.created_at).getTime());

    const groups: Record<string, number> = {};
    let cumulative = 0;

    // For simplicity, we just aggregate all history or filtered history
    sortedEmployees.forEach(emp => {
      const date = new Date(emp.createdAt || emp.created_at);
      let key = '';
      if (period === 'Monthly') {
        key = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
      } else if (period === 'Quarterly') {
        const q = Math.floor(date.getMonth() / 3) + 1;
        key = `Q${q} '${date.getFullYear().toString().slice(-2)}`;
      } else {
        key = date.getFullYear().toString();
      }
      
      cumulative++;
      groups[key] = cumulative;
    });

    return Object.entries(groups).map(([label, count]) => ({ label, count }));
  }, [filteredEmployees, period]);

  const stats = useMemo(() => {
    if (growthTrend.length < 2) return { growthPct: '0.0', netChange: filteredEmployees.length, avgMonthly: filteredEmployees.length };
    
    const startCount = growthTrend[0].count;
    const endCount = growthTrend[growthTrend.length - 1].count;
    const netChange = endCount - startCount;
    const growthPct = startCount > 0 ? ((netChange / startCount) * 100).toFixed(1) : '100.0';
    
    const totalMonths = (new Date().getFullYear() - new Date(filteredEmployees[0].createdAt || filteredEmployees[0].created_at).getFullYear()) * 12 + new Date().getMonth() - new Date(filteredEmployees[0].createdAt || filteredEmployees[0].created_at).getMonth() || 1;
    const avgMonthly = (netChange / totalMonths).toFixed(1);

    return { growthPct, netChange, avgMonthly };
  }, [growthTrend, filteredEmployees]);

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Workforce Growth Analytics"
      icon={<TrendingUp className="w-6 h-6" />}
      redirectUrl="/reports"
      redirectLabel="Open Workforce Analytics"
    >
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#9CA3AF]" />
          <span className="text-sm font-bold text-[#4B5563]">Filters:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <CustomSelect
            value={period}
            onChange={(v) => setPeriod(v as any)}
            options={[
              { value: 'Monthly', label: 'Monthly' },
              { value: 'Quarterly', label: 'Quarterly' },
              { value: 'Yearly', label: 'Yearly' }
            ]}
            className="w-32"
          />
          <CustomSelect
            value={deptFilter}
            onChange={setDeptFilter}
            options={[{ value: '', label: 'All Departments' }, ...uniqueDepts.map(d => ({ value: d, label: d }))]}
            className="w-40"
          />
          <CustomSelect
            value={yearFilter}
            onChange={setYearFilter}
            options={[{ value: 'All', label: 'All Time' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
            className="w-32"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Growth Percentage</p>
          <p className="text-4xl font-black mt-2 text-[#10B981]">+{stats.growthPct}%</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Net Employee Change</p>
          <p className="text-4xl font-black mt-2 text-[#3B82F6]">+{stats.netChange}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Avg Monthly Growth</p>
          <p className="text-4xl font-black mt-2 text-[#F59E0B]">+{stats.avgMonthly}</p>
        </div>
      </div>

      {/* Large Interactive Chart */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-[#111827] mb-6">Growth Trend ({period})</h3>
        <div className="flex-1 min-h-[400px]">
          {growthTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} dy={10} angle={-45} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="count" name="Total Employees" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No growth data available for selected filters.</div>
          )}
        </div>
      </div>
    </BaseDashboardModal>
  );
}
