import { useMemo, useState } from 'react';
import { Laptop, Search, Download, Filter } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { CustomSelect } from '@/src/common/components/CustomSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell , Legend } from 'recharts';

interface AssignedAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: any[];
  employees: any[];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AssignedAssetsModal({ isOpen, onClose, devices, employees }: AssignedAssetsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const stats = useMemo(() => {
    const total = devices.length;
    const assigned = devices.filter(d => d.status === 'assigned').length;
    const available = devices.filter(d => d.status === 'available').length;
    const maintenance = devices.filter(d => d.status === 'maintenance' || d.status === 'repair').length;
    return { total, assigned, available, maintenance };
  }, [devices]);

  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach(d => {
      if (d.status === 'assigned' && d.userId) {
        const emp = employees.find(e => e.id === d.userId);
        const dept = emp ? (emp.accountAssignment || emp.account || 'Unassigned') : 'Unassigned';
        counts[dept] = (counts[dept] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [devices, employees]);

  const mappedDevices = useMemo(() => {
    return devices.map(d => {
      const emp = employees.find(e => e.id === d.userId);
      return {
        ...d,
        employeeName: emp ? emp.fullName : 'Unassigned',
        department: emp ? (emp.accountAssignment || emp.account || 'Unassigned') : 'Unassigned',
      };
    });
  }, [devices, employees]);

  const filteredDevices = useMemo(() => {
    return mappedDevices.filter(d => {
      const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (d.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (d.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || d.status === statusFilter;
      const matchesType = !typeFilter || d.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [mappedDevices, searchTerm, statusFilter, typeFilter]);

  const uniqueTypes = useMemo(() => Array.from(new Set(devices.map(d => d.type || 'unknown'))), [devices]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(devices.map(d => d.status || 'unknown'))), [devices]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Asset ID,Asset Type,Employee,Department,Assigned Date,Status\n" +
      filteredDevices.map(d => `"${d.serialNumber || d.id || ''}","${d.type || ''}","${d.employeeName}","${d.department}","${formatTime(d.assignedDate || d.updatedAt)}","${d.status || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assets_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Asset Management Overview"
      icon={<Laptop className="w-6 h-6" />}
      redirectUrl="/assets"
      redirectLabel="Open Asset Management"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: stats.total, color: 'text-[#111827]' },
          { label: 'Assigned', value: stats.assigned, color: 'text-blue-600' },
          { label: 'Available', value: stats.available, color: 'text-green-600' },
          { label: 'Under Maintenance', value: stats.maintenance, color: 'text-orange-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
            <p className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Distribution Chart */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-[#111827] mb-4">Assigned Assets by Department</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {distributionData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
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
              placeholder="Search assets..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <CustomSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[{ value: '', label: 'All Types' }, ...uniqueTypes.map(t => ({ value: t, label: t }))]}
            />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: '', label: 'All Statuses' }, ...uniqueStatuses.map(s => ({ value: s, label: s }))]}
            />
            <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Asset ID</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Type</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Employee</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredDevices.slice(0, 50).map(device => (
                <tr key={device.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm text-[#4B5563] font-mono">{device.serialNumber || device.id}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{device.type}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{device.employeeName}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{device.department}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${
                      device.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                      device.status === 'available' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No assets found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
