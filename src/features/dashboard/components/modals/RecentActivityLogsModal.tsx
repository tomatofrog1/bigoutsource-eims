import { useMemo, useState } from 'react';
import { Clock, Search, Download, Filter } from 'lucide-react';
import { useDebounce } from '@/src/hooks/useDebounce';
import { BaseDashboardModal } from './BaseDashboardModal';
import { CustomSelect } from '@/src/common/components/CustomSelect';

interface RecentActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
}

function formatTime(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return action.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function RecentActivityLogsModal({ isOpen, onClose, logs }: RecentActivityLogsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [userFilter, setUserFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const uniqueUsers = useMemo(() => Array.from(new Set(logs.map(l => l.userEmail || 'System'))), [logs]);
  const uniqueModules = useMemo(() => Array.from(new Set(logs.map(l => l.entityType || 'General'))), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesSearch = (l.userEmail || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                            actionLabel(l.action).toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            (l.details?.fullName || l.entityType || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const user = l.userEmail || 'System';
      const module = l.entityType || 'General';

      const matchesUser = !userFilter || user === userFilter;
      const matchesModule = !moduleFilter || module === moduleFilter;

      return matchesSearch && matchesUser && matchesModule;
    });
  }, [logs, debouncedSearchTerm, userFilter, moduleFilter]);

  const timelineLogs = useMemo(() => logs.slice(0, 10), [logs]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Timestamp,User,Action,Module,Description\n" +
      filteredLogs.map(l => `"${formatTime(l.createdAt)}","${l.userEmail || 'System'}","${actionLabel(l.action)}","${l.entityType || 'General'}","${l.details?.fullName || l.details?.employeeNumber || 'Update'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Recent Activity Logs"
      icon={<Clock className="w-6 h-6" />}
      redirectUrl="/logs"
      redirectLabel="Open Audit Logs"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Timeline */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col lg:col-span-1 h-[500px] overflow-hidden">
          <h3 className="text-sm font-bold text-[#111827] mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#9CA3AF]" />
            Activity Timeline
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 relative">
            <div className="absolute left-2.5 top-2 bottom-0 w-0.5 bg-[#E5E7EB]" />
            <div className="space-y-6 relative z-10">
                {timelineLogs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                        <div className="w-5 h-5 rounded-full bg-white border-2 border-[#6366F1] shrink-0 mt-0.5" />
                        <div className="flex-1 pb-1">
                            <p className="text-xs text-[#9CA3AF] font-bold mb-1">{formatTime(log.createdAt)}</p>
                            <p className="text-sm font-bold text-[#111827]">
                                {log.userEmail || 'System'}
                                <span className="font-medium text-[#6B7280]"> {actionLabel(log.action).toLowerCase()}</span>
                            </p>
                            <div className="mt-1.5 p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[0.6875rem] text-[#4B5563] font-mono break-all">
                                Module: {log.entityType || 'General'}<br/>
                                Target: {log.details?.fullName || log.details?.employeeNumber || 'System Config'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col lg:col-span-2 h-[500px]">
            <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <CustomSelect
                        value={userFilter}
                        onChange={setUserFilter}
                        options={[{ value: '', label: 'All Users' }, ...uniqueUsers.map(u => ({ value: u, label: u }))]}
                        className="w-[120px]"
                    />
                    <CustomSelect
                        value={moduleFilter}
                        onChange={setModuleFilter}
                        options={[{ value: '', label: 'All Modules' }, ...uniqueModules.map(m => ({ value: m, label: m }))]}
                        className="w-[120px]"
                    />
                    <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Timestamp</th>
                        <th className="px-4 py-3 text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">User</th>
                        <th className="px-4 py-3 text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Action</th>
                        <th className="px-4 py-3 text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Module</th>
                        <th className="px-4 py-3 text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Description</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                    {filteredLogs.slice(0, 50).map(log => (
                        <tr key={log.id} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3 text-xs text-[#4B5563] whitespace-nowrap">{formatTime(log.createdAt)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-[#111827] max-w-[150px] truncate" title={log.userEmail}>{log.userEmail || 'System'}</td>
                            <td className="px-4 py-3 text-xs">
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[0.625rem] font-bold border border-indigo-100 uppercase tracking-wider whitespace-nowrap">
                                    {actionLabel(log.action)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#6B7280]">{log.entityType || 'General'}</td>
                            <td className="px-4 py-3 text-xs text-[#4B5563] truncate max-w-[200px]" title={log.details?.fullName || log.details?.employeeNumber || 'System Config Update'}>
                                {log.details?.fullName || log.details?.employeeNumber || 'System Config Update'}
                            </td>
                        </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                        <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No logs found matching criteria.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
            {filteredLogs.length > 50 && (
                <div className="p-2 text-center text-[0.625rem] text-[#6B7280] bg-[#F9FAFB] border-t border-[#F3F4F6] shrink-0">
                    Showing first 50 results. Use export or filters to see more.
                </div>
            )}
        </div>
      </div>
    </BaseDashboardModal>
  );
}
