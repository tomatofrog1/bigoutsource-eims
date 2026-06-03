import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Laptop, Database, Cpu, Wifi, Key, ExternalLink, ShieldCheck, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { Pagination } from '@/src/components/Pagination';
import { SkeletonLoadingMessage } from '@/src/components/SkeletonLoadingMessage';
import { motion, AnimatePresence } from 'motion/react';
import { deviceService } from '@/src/services/deviceService';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export default function Assets() {
  const [devices, setDevices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [licenseFilter, setLicenseFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const recordsPerPage = 10;

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
  }, [searchTerm, licenseFilter, sortConfig]);

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      setIsLoading(true);
      try {
        const result = await deviceService.list();
        if (isMounted) {
          const activeDevices = asArray(result).filter(
            (device: any) => device.assigneeStatus === 'active' && !device.isArchived
          );
          setDevices(activeDevices);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDevices = useMemo(() => {
    let result = devices;

    if (licenseFilter !== 'All') {
      result = result.filter(d => licenseFilter === 'Licensed' ? !!d.windowsKey : !d.windowsKey);
    }

    const search = searchTerm.toLowerCase();
    if (search) {
      result = result.filter((device) =>
        [device.pcName, device.remoteId, device.rustdeskId, device.windowsKey, device.assigneeName]
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
        let aVal = String(a.assigneeName || '').toLowerCase();
        let bVal = String(b.assigneeName || '').toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    return result;
  }, [devices, searchTerm, licenseFilter, sortConfig]);

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
    <PageLayout title="IT Asset Management">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by PC Name, Remote ID, or License..."
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
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563]">
              <Wifi className="w-4 h-4" />
              Check Conn.
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white rounded-xl text-sm font-bold text-[#4B5563]">
              <Database className="w-4 h-4" />
              Scan Network
            </button>
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
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-black text-[#111827]">{stat.value}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto relative">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {[
                      { key: 'pcName', label: 'Asset Identifier' },
                      { key: 'assigneeName', label: 'Assignee' },
                      { key: 'windowsKey', label: 'License Type' },
                      { key: 'rustdeskId', label: 'Remote Access' },
                    ].map((header) => {
                      const isActiveSort = sortConfig?.key === header.key;
                      const SortIcon = isActiveSort ? (sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                      return (
                        <th key={header.key} className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest text-left">
                          <button
                            type="button"
                            onClick={() => toggleSort(header.key)}
                            className={`flex items-center gap-1.5 hover:text-[#111827] transition-colors ${isActiveSort ? 'text-[#111827]' : ''}`}
                          >
                            {header.label}
                            <SortIcon className="w-3.5 h-3.5" />
                          </button>
                        </th>
                      );
                    })}
                    <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {[...Array(recordsPerPage)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[#F3F4F6] last:border-0">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-lg w-28"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
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
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {[
                      { key: 'pcName', label: 'Asset Identifier' },
                      { key: 'assigneeName', label: 'Assignee' },
                      { key: 'windowsKey', label: 'License Type' },
                      { key: 'rustdeskId', label: 'Remote Access' },
                    ].map((header) => {
                      const isActiveSort = sortConfig?.key === header.key;
                      const SortIcon = isActiveSort ? (sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                      return (
                        <th key={header.key} className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest text-left">
                          <button
                            type="button"
                            onClick={() => toggleSort(header.key)}
                            className={`flex items-center gap-1.5 hover:text-[#111827] transition-colors ${isActiveSort ? 'text-[#111827]' : ''}`}
                          >
                            {header.label}
                            <SortIcon className="w-3.5 h-3.5" />
                          </button>
                        </th>
                      );
                    })}
                    <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
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
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-[#111827] font-mono">{device.pcName || 'Unassigned'}</p>
                        <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-tighter mt-0.5">BIOS: {device.biosDate || 'Not set'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#4B5563]">{device.assigneeName || 'Unassigned'}</span>
                          <Link to={`/employee/${device.assigneeId || device.id}`}><ExternalLink className="w-3 h-3 text-[#D1D5DB]" /></Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          <span className="text-xs font-bold text-[#111827] uppercase">{device.windowsKey ? 'Windows / Assigned' : 'No Key'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="py-1 px-3 bg-[#F3F4F6] rounded-lg w-fit">
                          <p className="text-xs font-black text-[#111827] font-mono">{device.rustdeskId || device.remoteId || 'No remote ID'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/employee/${device.assigneeId || device.id}`} className="text-[10px] font-black uppercase text-[#111827] hover:underline">Full Specs</Link>
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
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
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
      </div>
    </PageLayout>
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
          className={`h-4 w-4 shrink-0 transition-transform text-[#9CA3AF] ${
            isOpen ? 'rotate-90' : ''
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
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6] ${
                      value === opt.value ? 'bg-[#EFF6FF]' : ''
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
