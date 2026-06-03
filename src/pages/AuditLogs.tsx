import { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, History, Loader2, Search, ChevronRight, CheckCircle2, ArrowUp, ArrowDown, ArrowUpDown, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { Pagination } from '@/src/components/Pagination';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { auditLogService } from '@/src/services/auditLogService';
import { cn } from '@/src/lib/utils';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function formatDateToParts(value?: string) {
  if (!value) return { date: 'Unknown', time: '' };
  const d = new Date(value);
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d),
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d),
  };
}

function cleanString(str: string) {
  if (!str) return '-';
  const cleaned = str
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  if (cleaned === 'Employee Import Staging') {
    return 'Import Edits';
  }

  return cleaned;
}

function formatFieldName(field: string) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (!value.length) return 'None';
    if (value.every((item) => typeof item !== 'object' || item === null)) return value.map(formatValue).join(', ');
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }
  if (typeof value === 'object') {
    const summary = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
      .slice(0, 3)
      .map(([key, entryValue]) => `${formatFieldName(key)}: ${formatValue(entryValue)}`)
      .join(', ');

    return summary || 'Recorded';
  }
  return String(value);
}

function detailsItems(details: any) {
  if (!details) return [];

  if (Array.isArray(details.changes) && details.changes.length) {
    return details.changes.map((change: any) => ({
      field: formatFieldName(change.field),
      from: formatValue(change.from),
      to: formatValue(change.to),
    }));
  }

  return Object.entries(details)
    .filter(([key]) => key !== 'changes')
    .map(([key, value]) => ({
      field: formatFieldName(key),
      value: formatValue(value),
    }));
}

function detailsText(details: any) {
  const items = detailsItems(details);

  if (!items.length) return 'No details recorded';

  return items
    .map((item: any) => ('to' in item ? `${item.field}: "${item.from}" to "${item.to}"` : `${item.field}: ${item.value}`))
    .join('; ');
}

function actorLabel(log: any) {
  return log.userName || 'System';
}

type SortConfig = { key: string; direction: 'asc' | 'desc' };

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [entityFilter, setEntityFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [undoTargetLog, setUndoTargetLog] = useState<any | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const recordsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, entityFilter, userFilter, startDate, endDate, sortConfig]);

  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate('');
    }
  }, [startDate, endDate]);

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      setIsLoading(true);
      try {
        const data = await auditLogService.list({ limit: 1000 });
        if (isMounted) setLogs(asArray(data));
      } catch (error: any) {
        toast.error(error.message || 'Unable to load audit logs');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLogs();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleUndo = (log: any) => {
    if (!log.action.endsWith('.update')) {
      toast.error('Only update actions can be undone.');
      return;
    }
    setUndoTargetLog(log);
  };

  const confirmUndo = async () => {
    if (!undoTargetLog) return;
    setIsUndoing(true);
    const loadingToast = toast.loading('Undoing action...');
    try {
      await auditLogService.undo(undoTargetLog.id);
      toast.success('Action successfully undone.', { id: loadingToast });
      setRefreshTrigger((prev) => prev + 1);
      setUndoTargetLog(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to undo action', { id: loadingToast });
    } finally {
      setIsUndoing(false);
    }
  };

  const actionOptions = useMemo(() => {
    const actions = Array.from(new Set(logs.map((log) => cleanString(log.action)).filter(Boolean)));
    actions.sort((a, b) => a.localeCompare(b));
    return ['All', ...actions];
  }, [logs]);

  const entityOptions = useMemo(() => {
    const entities = Array.from(new Set(logs.map((log) => cleanString(log.entityType)).filter(Boolean)));
    entities.sort((a, b) => a.localeCompare(b));
    return ['All', ...entities];
  }, [logs]);

  const userOptions = useMemo(() => {
    const users = Array.from(new Set(logs.map(actorLabel).filter(Boolean)));
    users.sort((a, b) => a.localeCompare(b));
    return ['All', ...users];
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const searchable = `${cleanString(log.action)} ${cleanString(log.entityType)} ${log.userEmail} ${log.userName} ${log.userRole} ${detailsText(log.details)}`.toLowerCase();
    const matchesSearch = searchable.includes(search.toLowerCase());
    const matchesAction = actionFilter === 'All' || cleanString(log.action) === actionFilter;
    const matchesEntity = entityFilter === 'All' || cleanString(log.entityType) === entityFilter;
    const matchesUser = userFilter === 'All' || actorLabel(log) === userFilter;

    let matchesDateRange = true;
    if (startDate || endDate) {
      const logDate = new Date(log.createdAt);
      if (startDate && logDate < new Date(`${startDate}T00:00:00`)) matchesDateRange = false;
      if (endDate && logDate > new Date(`${endDate}T23:59:59`)) matchesDateRange = false;
    }

    return matchesSearch && matchesAction && matchesEntity && matchesUser && matchesDateRange;
  });

  const sortedLogs = useMemo(() => {
    if (!sortConfig) return filteredLogs;
    return [...filteredLogs].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'actor') {
        valA = actorLabel(a).toLowerCase();
        valB = actorLabel(b).toLowerCase();
      } else if (sortConfig.key === 'target') {
        valA = (a.details?.fullName || a.details?.employeeNumber || a.entityType || '').toLowerCase();
        valB = (b.details?.fullName || b.details?.employeeNumber || b.entityType || '').toLowerCase();
      }

      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;
      return 0;
    });
  }, [filteredLogs, sortConfig]);

  const totalPages = Math.ceil(sortedLogs.length / recordsPerPage);
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const pageEndIndex = pageStartIndex + recordsPerPage;
  const currentLogs = sortedLogs.slice(pageStartIndex, pageEndIndex);

  const toggleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null; // Reset to no sort
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: string) => {
    const isActiveSort = sortConfig?.key === key;
    const SortIcon = isActiveSort ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return <SortIcon className={cn('h-3.5 w-3.5 shrink-0', isActiveSort ? 'text-[#111827]' : 'text-[#9CA3AF]')} />;
  };

  return (
    <PageLayout title="System Audit Logs" contentClassName="w-full max-w-none">
      <div className="flex flex-col gap-6 w-full">

        {/* Filters and Search */}
        <div className="flex flex-col gap-4">
          {/* Top Row: Search */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-transparent outline-none transition-all"
            />
          </div>
          {/* Bottom Row: Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:border-transparent transition-all shadow-sm w-full min-w-0">
              <input
                type={startDate ? "date" : "text"}
                placeholder="Start Date"
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => (!e.target.value ? (e.target.type = "text") : null)}
                value={startDate}
                onChange={(e) => {
                  const nextStartDate = e.target.value;
                  setStartDate(nextStartDate);
                  if (nextStartDate && endDate && endDate < nextStartDate) setEndDate('');
                }}
                className="w-full bg-transparent text-sm font-bold text-[#4B5563] outline-none min-w-0"
              />
              <span className="text-[#9CA3AF] font-bold shrink-0">-</span>
              <input
                type={endDate ? "date" : "text"}
                placeholder="End Date"
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => (!e.target.value ? (e.target.type = "text") : null)}
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  const nextEndDate = e.target.value;
                  if (startDate && nextEndDate && nextEndDate < startDate) return;
                  setEndDate(nextEndDate);
                }}
                className="w-full bg-transparent text-sm font-bold text-[#4B5563] outline-none min-w-0 disabled:text-[#9CA3AF]"
              />
            </div>
            <FilterDropdown label="Action" value={actionFilter} onChange={setActionFilter} options={actionOptions} />
            <FilterDropdown label="Entity" value={entityFilter} onChange={setEntityFilter} options={entityOptions} />
            <FilterDropdown label="User" value={userFilter} onChange={setUserFilter} options={userOptions} />
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-[#EF4444] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black text-[#991B1B]">Security Notice</p>
            <p className="text-xs font-medium text-[#B91C1C] mt-0.5">Audit logs display privileged system activities including edits, additions, and access logs. These records are immutable.</p>
          </div>
        </div>

        {/* Logs Table */}
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm relative">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[15%] h-14">
                        <div className="py-2 text-left w-full">Timestamp</div>
                      </th>
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[25%] h-14">
                        <div className="py-2 text-left w-full">Operator</div>
                      </th>
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[15%] h-14">
                        <div className="py-2 text-left w-full">Action</div>
                      </th>
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[20%] h-14">
                        <div className="py-2 text-left w-full">Target Entity</div>
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[20%]">Details</th>
                      <th className="px-4 py-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-[#E5E7EB] last:border-0">
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded mb-2"></div><div className="h-3 w-16 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                            <div className="flex-1 space-y-2"><div className="h-4 w-32 bg-gray-200 rounded"></div><div className="h-3 w-40 bg-gray-200 rounded"></div></div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="h-6 w-24 bg-gray-200 rounded-full"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded mb-2"></div><div className="h-3 w-20 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="h-6 w-full max-w-sm bg-gray-200 rounded"></div></td>
                        <td className="px-4 py-4"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SkeletonLoadingMessage message="Fetching system activity..." />
            </motion.div>
          ) : (
            <motion.div key="content-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[15%] h-14">
                        <button type="button" onClick={() => toggleSort('createdAt')} className="flex items-center gap-1.5 py-2 hover:text-[#111827] transition-colors uppercase tracking-widest text-left w-full">
                          Timestamp {renderSortIcon('createdAt')}
                        </button>
                      </th>
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[25%] h-14">
                        <button type="button" onClick={() => toggleSort('actor')} className="flex items-center gap-1.5 py-2 hover:text-[#111827] transition-colors uppercase tracking-widest text-left w-full">
                          Operator {renderSortIcon('actor')}
                        </button>
                      </th>
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[15%] h-14">
                        <button type="button" onClick={() => toggleSort('action')} className="flex items-center gap-1.5 py-2 hover:text-[#111827] transition-colors uppercase tracking-widest text-left w-full">
                          Action {renderSortIcon('action')}
                        </button>
                      </th>
                      <th className="px-6 py-0 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[20%] h-14">
                        <button type="button" onClick={() => toggleSort('target')} className="flex items-center gap-1.5 py-2 hover:text-[#111827] transition-colors uppercase tracking-widest text-left w-full">
                          Target Entity {renderSortIcon('target')}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[20%]">Details</th>
                      <th className="px-4 py-4 text-[10px] font-black text-[#6B7280] uppercase tracking-widest w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {currentLogs.map((log, index) => {
                      const { date, time } = formatDateToParts(log.createdAt);
                      return (
                        <motion.tr 
                          key={log.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
                          className="hover:bg-[#F9FAFB] transition-colors align-top group border-b border-[#E5E7EB] last:border-0"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-bold text-[#111827]">{date}</p>
                            <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider mt-1">{time}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-[10px] font-black text-[#111827] shrink-0 group-hover:border-[#D1D5DB] transition-colors">
                                {actorLabel(log).substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#111827] truncate">{actorLabel(log)}</p>
                                {log.userEmail && <p className="text-xs font-semibold text-[#6B7280] truncate mt-0.5">{log.userEmail}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-[#E5E7EB] text-[#4B5563] shadow-sm">
                              {cleanString(log.action)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-[#111827] truncate">{log.details?.fullName || log.details?.employeeNumber || cleanString(log.entityType)}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#9CA3AF] mt-1">{cleanString(log.entityType)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <AuditDetails details={log.details} />
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            {log.action.endsWith('.update') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUndo(log);
                                }}
                                className="p-2 text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors inline-flex items-center justify-center group/undo"
                                title="Undo Action"
                              >
                                <Undo2 className="w-4 h-4 transition-transform group-hover/undo:-rotate-45" />
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(!isLoading && sortedLogs.length === 0) && (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                    <History className="w-8 h-8 text-[#D1D5DB]" />
                  </div>
                  <h3 className="text-lg font-black text-[#111827]">No audit logs found</h3>
                  <p className="text-sm font-medium text-[#6B7280] mt-1 max-w-sm">
                    Try adjusting your search terms or filters to find what you are looking for.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {sortedLogs.length > 0 && !isLoading && (
          <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
                Total Logs: {sortedLogs.length}
              </p>
              <p className="mt-1 text-xs font-black text-[#111827]">
                Page {currentPage} of {totalPages || 1}
              </p>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {undoTargetLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Undo2 className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-black text-[#111827]">
                    Undo Revert Action
                  </h3>

                  <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                    Are you sure you want to revert this{' '}
                    <span className="font-bold text-[#111827]">
                      {cleanString(undoTargetLog.action)}
                    </span>{' '}
                    action? This will restore the fields to their previous values.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUndoTargetLog(null)}
                  disabled={isUndoing}
                  className="px-4 py-2.5 border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] hover:text-[#111827] disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmUndo}
                  disabled={isUndoing}
                  className="flex items-center gap-2 px-4 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
                >
                  {isUndoing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Undo2 className="w-4 h-4" />
                  )}
                  Confirm Undo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

function AuditDetails({ details }: { details: any }) {
  const items = detailsItems(details);

  if (!items.length) {
    return (
      <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-[#F9FAFB] text-[#9CA3AF] border border-[#F3F4F6]">
        No details
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-sm">
      {items.map((item: any, index: number) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">{item.field}</span>
          {'to' in item ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#111827] truncate flex-1">{item.from}</span>
              <span className="text-[#D1D5DB] shrink-0 font-black">-&gt;</span>
              <span className="font-bold text-[#111827] truncate flex-1">{item.to}</span>
            </div>
          ) : (
            <div className="text-xs font-bold text-[#111827] break-all">
              {item.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = value === 'All' ? `All ${label === 'Entity' ? 'Entities' : label + 's'}` : value;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-[150px] w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] hover:bg-[#F9FAFB] focus:ring-2 focus:ring-[#2563EB] shadow-sm"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} />
      </button>
      <AnimatePresence>
{isOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 top-[calc(100%+8px)] z-20 w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = value === option;
              const optionDisplay = option === 'All' ? `All ${label === 'Entity' ? 'Entities' : label + 's'}` : option;
              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#F3F4F6]',
                    isSelected ? 'bg-[#EFF6FF]' : ''
                  )}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  <span className={cn('truncate text-sm font-bold', isSelected ? 'text-[#2563EB]' : 'text-[#4B5563]')}>
                    {optionDisplay}
                  </span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
