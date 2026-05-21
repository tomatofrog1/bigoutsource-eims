import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Laptop, Database, Cpu, Wifi, Key, ExternalLink, ShieldCheck, Search } from 'lucide-react';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { deviceService } from '@/src/services/deviceService';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export default function Assets() {
  const [devices, setDevices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      setIsLoading(true);
      try {
        const result = await deviceService.list();
        if (isMounted) setDevices(asArray(result));
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
    const search = searchTerm.toLowerCase();
    return devices.filter((device) =>
      [device.pcName, device.remoteId, device.rustdeskId, device.windowsKey, device.assigneeName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [devices, searchTerm]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl bg-[#F9FAFB] ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider">{stat.label}</p>
              </div>
              <p className="text-2xl font-black text-[#111827]">{isLoading ? '...' : stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Asset Identifier</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Assignee</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">License Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Remote Access</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-[#F9FAFB] transition-colors">
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
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && filteredDevices.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-[#9CA3AF]">No asset records found.</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
