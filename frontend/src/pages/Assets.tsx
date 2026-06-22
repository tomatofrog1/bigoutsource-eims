import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Laptop, Cpu, Key, ExternalLink, ShieldCheck, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, CheckCircle2, Edit2, Save, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { Pagination } from '@/src/components/Pagination';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { motion, AnimatePresence } from 'motion/react';
import { deviceService } from '@/src/features/assets/services/deviceService';
import { accountService } from '@/src/services/accountService';
import { useAuth } from '@/src/contexts/AuthContext';
import { AccountOption, normalizeAccountList } from '@/src/pages/Directory';
import { AccountFilterDropdown } from '@/src/features/employees/components/DirectoryUI';
import { cn } from '@/src/lib/utils';
import { useRealtimeSubscription } from '@/src/hooks/useRealtimeSubscription';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// sample comment
export type AssetFieldKey = 'assigneeName' | 'pcName' | 'biosDate' | 'windowsKey' | 'rustdeskId' | 'activityWatchStatus' | 'esetStatus';

export const assetFields: Array<{ key: AssetFieldKey; label: string; width: string }> = [
  { key: 'assigneeName', label: 'Assignee', width: 'w-[20%]' },
  { key: 'pcName', label: 'PC Name', width: 'w-[16%]' },
  { key: 'biosDate', label: 'BIOS Date', width: 'w-[12%]' },
  { key: 'windowsKey', label: 'Windows License Key', width: 'w-[20%]' },
  { key: 'rustdeskId', label: 'RustDesk ID', width: 'w-[12%]' },
  { key: 'activityWatchStatus', label: 'Activity Watch', width: 'w-[12%]' },
  { key: 'esetStatus', label: 'ESET Status', width: 'w-[12%]' },
];



function formatWindowsLicenseKey(value = '') {
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 25)
    .match(/.{1,5}/g)
    ?.join('-') || '';
}

function formatRustdeskId(value = '') {
  return value
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    .slice(0, 17);
}

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export default function Assets() {
  const { can } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [allDevices, setAllDevices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [licenseFilter, setLicenseFilter] = useState('All');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountFilter, setAccountFilter] = useState('All Account');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const recordsPerPage = 10;

  useRealtimeSubscription({
    table: 'employees',
    onChange: () => setRefreshTrigger(prev => prev + 1)
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Partial<any>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const visibleFields = assetFields;

  const hasChanges = useMemo(() => {
    return Object.entries(drafts).some(([id, draft]) => {
      const original = devices.find(d => d.id === id);
      if (!original) return false;
      return Object.entries(draft).some(([key, val]) => original[key as keyof typeof original] !== val);
    });
  }, [drafts, devices]);

  const changesPreview = useMemo(() => {
    if (!isConfirmModalOpen) return [];
    return Object.entries(drafts).map(([id, draft]) => {
      const original = devices.find(d => d.id === id);
      if (!original) return null;

      const changedFields = Object.entries(draft).filter(([key, val]) => original[key as keyof typeof original] !== val);
      if (changedFields.length === 0) return null;

      return {
        id,
        pcName: original.pcName || 'Unassigned',
        assigneeName: original.assigneeName || 'Unassigned',
        changes: changedFields
      };
    }).filter(Boolean);
  }, [drafts, devices, isConfirmModalOpen]);

  const handleUpdateDraft = (id: string, field: string, value: any) => {
    setDrafts(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || devices.find(d => d.id === id) || {}),
        [field]: value
      }
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const draftEntries = Object.entries(drafts);
      if (draftEntries.length === 0) {
        setIsEditMode(false);
        return;
      }

      const results = await Promise.allSettled(
        draftEntries.map(([id, payload]) => deviceService.update(id, payload))
      );

      const successes: any[] = [];
      let failures = 0;

      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          successes.push({ id: draftEntries[index][0], updated: res.value });
        } else {
          failures++;
        }
      });

      if (successes.length > 0) {
        setDevices(current => current.map(d => {
          const matched = successes.find(s => s.id === d.id);
          return matched ? { ...d, ...matched.updated } : d;
        }));
      }

      if (failures > 0) {
        toast.error(`Failed to update ${failures} asset(s)`);
      } else {
        toast.success('Assets updated successfully');
      }

      setDrafts({});
      setIsEditMode(false);
    } catch (err) {
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDrafts({});
    setIsEditMode(false);
  };

  const internalAccounts = useMemo(() => accounts.filter((account) => account.accountType === 'internal'), [accounts]);
  const externalAccounts = useMemo(() => accounts.filter((account) => account.accountType === 'external'), [accounts]);

  const toggleSort = (key: string) => {
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, licenseFilter, accountFilter, sortConfig]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [devicesResult, accountsResult] = await Promise.allSettled([
          deviceService.list(),
          accountService.list(),
        ]);
        if (!isMounted) return;

        if (devicesResult.status === 'fulfilled') {
          const fetchedDevices = asArray(devicesResult.value);
          setAllDevices(fetchedDevices.filter((d: any) => !d.isArchived));
          const activeDevices = fetchedDevices.filter(
            (device: any) => device.assigneeStatus === 'active' && !device.isArchived
          );
          setDevices(activeDevices);
        }

        if (accountsResult.status === 'fulfilled') {
          setAccounts(normalizeAccountList(accountsResult.value));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const filteredDevices = useMemo(() => {
    let result = devices;

    if (licenseFilter !== 'All') {
      result = result.filter(d => licenseFilter === 'Licensed' ? !!d.windowsKey : !d.windowsKey);
    }

    if (accountFilter !== 'All Account') {
      result = result.filter(d => d.assigneeAccount === accountFilter);
    }

    const search = searchTerm.toLowerCase();
    if (search) {
      result = result.filter((device) =>
        [device.pcName, device.rustdeskId, device.windowsKey, device.assigneeName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      );
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result = [...result].sort((a, b) => {
        const aDate = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const bDate = new Date(b.createdAt || b.updatedAt || 0).getTime();
        if (bDate !== aDate) {
          return bDate - aDate; // Descending order
        }

        let aVal = String(a.assigneeName || '').toLowerCase();
        let bVal = String(b.assigneeName || '').toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    return result;
  }, [devices, searchTerm, licenseFilter, accountFilter, sortConfig]);

  const paginatedDevices = useMemo(() => {
    return filteredDevices.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
  }, [filteredDevices, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / recordsPerPage));

  const stats = useMemo(
    () => [
      { label: 'Total Assigned', value: devices.filter((device) => device.status === 'assigned').length, icon: Laptop, color: 'text-blue-600' },
      { label: 'Unlicensed Win', value: devices.filter((device) => !device.windowsKey).length, icon: Key, color: 'text-orange-600' },
      { label: 'ESET Active', value: devices.filter((device) => device.esetStatus === 'active').length, icon: ShieldCheck, color: 'text-green-600' },
      { label: 'Missing BIOS', value: devices.filter((device) => !device.biosDate).length, icon: Cpu, color: 'text-red-600' },
    ],
    [devices]
  );

  return (
    <PageLayout title="IT Asset Management" contentClassName="w-full max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by PC Name, RustDesk ID, or License..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#111827] outline-none"
                />
              </div>
              <AnimatedSelect
                value={licenseFilter}
                onChange={setLicenseFilter}
                options={[
                  { value: 'All', label: 'All Licenses' },
                  { value: 'Licensed', label: 'Has Windows Key' },
                  { value: 'Unlicensed', label: 'No Key' },
                ]}
              />
              <AccountFilterDropdown
                value={accountFilter}
                onChange={setAccountFilter}
                internalAccounts={internalAccounts}
                externalAccounts={externalAccounts}
              />
            </div>
            <div className="flex gap-2">
              {can('assets.edit') && (
                <AnimatePresence mode="wait" initial={false}>
                  {isEditMode ? (
                    <motion.div
                      key="edit-actions"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex gap-2"
                    >
                      <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={isSaving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2.5 border border-transparent bg-[#111827] text-white rounded-xl text-sm font-bold hover:bg-[#374151] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view-actions"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white keep-white rounded-xl text-sm font-bold text-[#4B5563] hover:shadow-md transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Mode
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

        <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div key="skeleton-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-gray-200 rounded-xl" />
                      <div className="w-24 h-3 bg-gray-200 rounded" />
                    </div>
                    <div className="w-16 h-8 bg-gray-200 rounded" />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="content-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-xl bg-[#F9FAFB] ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <p className="text-[0.625rem] font-black text-[#9CA3AF] uppercase tracking-wider">{stat.label}</p>
                    </div>
                    <p className="text-2xl font-black text-[#111827]">{stat.value}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        {/* Asset Allocation Chart */}
        {!isLoading && allDevices.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm w-full lg:w-1/2">
            <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-[#9CA3AF]" />
              Asset Allocation
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Assigned', value: allDevices.filter(d => d.assigneeStatus === 'active').length },
                      { name: 'Unassigned', value: allDevices.filter(d => d.assigneeStatus !== 'active').length }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {[
                      { name: 'Assigned', value: allDevices.filter(d => d.assigneeStatus === 'active').length },
                      { name: 'Unassigned', value: allDevices.filter(d => d.assigneeStatus !== 'active').length }
                    ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Assigned' ? '#3B82F6' : '#9CA3AF'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto relative">
              <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {visibleFields.map((header) => {
                      const isActiveSort = sortConfig?.key === header.key;
                      const SortIcon = isActiveSort ? (sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                      return (
                        <th key={header.key} className={`px-6 py-4 text-[0.625rem] font-black text-[#9CA3AF] uppercase tracking-widest text-left ${header.width}`}>
                          <button
                            type="button"
                            onClick={() => toggleSort(header.key)}
                            className={`flex items-center gap-1.5 hover:text-[#111827] transition-colors ${isActiveSort ? 'text-[#111827]' : ''}`}
                          >
                            <span className="truncate">{header.label}</span>
                            <SortIcon className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </th>
                      );
                    })}
                    <th className="px-6 py-4 text-[0.625rem] font-black text-[#9CA3AF] uppercase tracking-widest w-[8%]"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {[...Array(recordsPerPage)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[#F3F4F6] last:border-0">
                      {visibleFields.map((f) => (
                        <td key={f.key} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      ))}
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
                </table>

                <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <p className="text-[0.625rem] font-bold text-[#6B7280] uppercase tracking-widest">
                      Total Assets: {filteredDevices.length}
                    </p>
                    <p className="mt-1 text-xs font-black text-[#111827]">
                      Page {currentPage} of {totalPages}
                    </p>
                  </div>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
                <SkeletonLoadingMessage message="Fetching asset data..." />
              </motion.div>
            ) : (
              <motion.div key="content-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      {visibleFields.map((header) => {
                        const isActiveSort = sortConfig?.key === header.key;
                        const SortIcon = isActiveSort ? (sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                        return (
                          <th key={header.key} className={`px-6 py-4 text-[0.625rem] font-black text-[#9CA3AF] uppercase tracking-widest text-left ${header.width}`}>
                            <button
                              type="button"
                              onClick={() => toggleSort(header.key)}
                              className={`flex items-center gap-1.5 hover:text-[#111827] transition-colors ${isActiveSort ? 'text-[#111827]' : ''}`}
                            >
                              <span className="truncate">{header.label}</span>
                              <SortIcon className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </th>
                        );
                      })}
                      <th className="px-6 py-4 text-[0.625rem] font-black text-[#9CA3AF] uppercase tracking-widest w-[8%]"></th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {paginatedDevices.map((device, index) => (
                      <motion.tr
                        key={device.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
                        className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                      >
                        {visibleFields.map((field) => (
                          <AnimatedCell
                            key={field.key}
                            isEditMode={isEditMode}
                            editContent={
                              field.key === 'assigneeName' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#4B5563]">{device.assigneeName || 'Unassigned'}</span>
                                </div>
                              ) : field.key === 'pcName' ? (
                                <p className="text-sm font-black text-[#111827] font-mono px-2 py-1">{device.pcName || 'Unassigned'}</p>
                              ) : field.key === 'biosDate' ? (
                                <input type="date" value={drafts[device.id]?.biosDate ?? (device.biosDate || '')} onChange={(e) => handleUpdateDraft(device.id, 'biosDate', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]" />
                              ) : field.key === 'windowsKey' ? (
                                <input type="text" value={drafts[device.id]?.windowsKey ?? (device.windowsKey || '')} onChange={(e) => handleUpdateDraft(device.id, 'windowsKey', formatWindowsLicenseKey(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" />
                              ) : field.key === 'rustdeskId' ? (
                                <input type="text" value={drafts[device.id]?.rustdeskId ?? (device.rustdeskId || '')} onChange={(e) => handleUpdateDraft(device.id, 'rustdeskId', formatRustdeskId(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]" placeholder="123 456 789" />
                              ) : field.key === 'activityWatchStatus' ? (
                                <select value={drafts[device.id]?.activityWatchStatus ?? (device.activityWatchStatus || 'missing')} onChange={(e) => handleUpdateDraft(device.id, 'activityWatchStatus', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]">
                                  <option value="missing">Missing</option>
                                  <option value="installed">Installed</option>
                                </select>
                              ) : field.key === 'esetStatus' ? (
                                <select value={drafts[device.id]?.esetStatus ?? (device.esetStatus || 'inactive')} onChange={(e) => handleUpdateDraft(device.id, 'esetStatus', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]">
                                  <option value="inactive">Inactive</option>
                                  <option value="active">Active</option>
                                </select>
                              ) : null
                            }
                            viewContent={
                              field.key === 'assigneeName' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#4B5563]">{device.assigneeName || 'Unassigned'}</span>
                                  <Link to={`/employee/${device.assigneeId || device.id}`}><ExternalLink className="w-3 h-3 text-[#D1D5DB]" /></Link>
                                </div>
                              ) : field.key === 'pcName' ? (
                                <p className="text-sm font-black text-[#111827] font-mono">{device.pcName || 'Unassigned'}</p>
                              ) : field.key === 'biosDate' ? (
                                <p className="text-xs font-bold text-[#111827]">{device.biosDate || 'Not set'}</p>
                              ) : field.key === 'windowsKey' ? (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Key className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                                    <span className="text-xs font-bold text-[#111827] uppercase">{device.windowsKey ? 'Windows / Assigned' : 'No Key'}</span>
                                  </div>
                                  {device.windowsKey && (
                                    <p className="text-[0.625rem] text-[#9CA3AF] font-bold uppercase tracking-tighter mt-0.5 ml-[22px]">{device.windowsKey}</p>
                                  )}
                                </div>
                              ) : field.key === 'rustdeskId' ? (
                                <div className="py-1 px-3 bg-[#F3F4F6] rounded-lg w-fit">
                                  <p className="text-xs font-black text-[#111827] font-mono">{device.rustdeskId || 'No RustDesk ID'}</p>
                                </div>
                              ) : field.key === 'activityWatchStatus' ? (
                                <span className={cn(
                                  'px-2 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-tighter',
                                  device.activityWatchStatus === 'installed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
                                )}>
                                  {device.activityWatchStatus || 'Missing'}
                                </span>
                              ) : field.key === 'esetStatus' ? (
                                <span className={cn(
                                  'px-2 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-tighter',
                                  device.esetStatus === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
                                )}>
                                  {device.esetStatus || 'Inactive'}
                                </span>
                              ) : null
                            }
                          />
                        ))}
                        <td className="px-6 py-4 text-right">
                          <Link to={`/employee/${device.assigneeId || device.id}`} className="text-[0.625rem] font-black uppercase text-[#111827] hover:underline flex items-center justify-end gap-1">
                            <ExternalLink className="w-3 h-3" /> Details
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>

                {!isLoading && filteredDevices.length === 0 && (
                  <div className="p-10 text-center text-sm font-bold text-[#9CA3AF]">No asset records found.</div>
                )}

                <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <p className="text-[0.625rem] font-bold text-[#6B7280] uppercase tracking-widest">
                      Total Assets: {filteredDevices.length}
                    </p>
                    <p className="mt-1 text-xs font-black text-[#111827]">
                      Page {currentPage} of {totalPages}
                    </p>
                  </div>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isConfirmModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl flex flex-col max-h-full"
                >
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                    <h3 className="text-lg font-black text-[#111827]">Review Changes</h3>
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="px-6 py-5 overflow-y-auto">
                    <p className="text-sm font-semibold text-[#4B5563] mb-4">You are about to modify the following IT Assets:</p>
                    <div className="space-y-3">
                      {changesPreview.map((preview: any) => preview && (
                        <div key={preview.id} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Laptop className="w-4 h-4 text-[#4B5563]" />
                            <span className="text-sm font-black text-[#111827]">{preview.assigneeName}</span>
                            <span className="text-xs font-bold text-[#6B7280]">({preview.pcName})</span>
                          </div>
                          <div className="space-y-2">
                            {preview.changes.map(([field, newVal]: [string, any]) => {
                              const originalVal = devices.find(d => d.id === preview.id)?.[field as keyof typeof devices[0]];
                              const formatVal = (v: any) => v || <span className="italic text-[#9CA3AF]">Empty</span>;
                              const fieldLabels: Record<string, string> = {
                                biosDate: 'BIOS Date',
                                windowsKey: 'Windows License',
                                rustdeskId: 'RustDesk ID'
                              };
                              return (
                                <div key={field} className="flex items-center gap-3 text-xs bg-white border border-[#E5E7EB] rounded-lg p-2 shadow-sm">
                                  <span className="font-bold text-[#4B5563] w-[100px] shrink-0">{fieldLabels[field] || field}</span>
                                  <div className="flex-1 flex items-center gap-2 min-w-0">
                                    <div className="flex-1 min-w-0 text-[#9CA3AF] truncate bg-[#F9FAFB] px-2 py-1 rounded line-through border border-transparent" title={String(originalVal)}>
                                      {formatVal(originalVal)}
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-[#D1D5DB] shrink-0" />
                                    <div className="flex-1 min-w-0 text-[#059669] font-bold truncate bg-[#ECFDF5] px-2 py-1 rounded border border-[#D1FAE5]" title={String(newVal)}>
                                      {formatVal(newVal)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] px-6 py-5 bg-[#F9FAFB] rounded-b-2xl">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      disabled={isSaving}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-bold text-[#4B5563] transition-colors hover:bg-[#F3F4F6] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handleSaveChanges();
                        setIsConfirmModalOpen(false);
                      }}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#374151] disabled:opacity-50 shadow-md"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Confirm & Save
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </PageLayout>
  );
}

function AnimatedCell({ isEditMode, editContent, viewContent, className = '' }: any) {
  return (
    <td className={`px-6 py-4 align-top ${className}`}>
      <AnimatePresence mode="wait">
        {isEditMode ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            {editContent}
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            {viewContent}
          </motion.div>
        )}
      </AnimatePresence>
    </td>
  );
}

function NumericInput({ value, onChange, placeholder, className }: any) {
  const [showHint, setShowHint] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/\D/g, '');

    if (rawValue !== numericValue) {
      setShowHint(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowHint(false), 2000);
    } else {
      setShowHint(false);
    }

    onChange(numericValue);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-0 top-full mt-1 text-[0.625rem] font-bold text-red-500 z-10 whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm border border-red-100 pointer-events-none"
          >
            Numbers only
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimatedSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label || 'Select...';

  return (
    <div className="relative min-w-[160px] z-10">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform text-[#9CA3AF] ${isOpen ? 'rotate-90' : ''
            }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
            >
              <div className="max-h-48 overflow-y-auto py-1">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6] ${value === opt.value ? 'bg-[#EFF6FF]' : ''
                      }`}
                  >
                    <span className={`truncate text-sm font-semibold ${value === opt.value ? 'text-[#2563EB]' : 'text-[#4B5563]'}`}>{opt.label}</span>
                    {value === opt.value && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
