import { useMemo, useState } from 'react';
import { Shield, Download, Search } from 'lucide-react';
import { useDebounce } from '@/src/hooks/useDebounce';
import { BaseDashboardModal } from './BaseDashboardModal';

interface SecurityComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: any[];
  employees: any[];
}

export function SecurityComplianceModal({ isOpen, onClose, devices, employees }: SecurityComplianceModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const stats = useMemo(() => {
    let compliantCount = 0;
    devices.forEach(d => {
        const isMissingEset = d.esetStatus === 'inactive' || d.esetStatus === 'Inactive';
        const isMissingAW = d.activityWatchStatus === 'missing' || d.activityWatchStatus === 'Missing';
        const isUnlicensed = !d.windowsKey;
        if (!isMissingEset && !isMissingAW && !isUnlicensed) {
            compliantCount++;
        }
    });

    const score = devices.length > 0 ? ((compliantCount / devices.length) * 100).toFixed(1) : '100.0';
    return { score, compliantCount, total: devices.length };
  }, [devices]);

  const categories = useMemo(() => {
    let missingEset = 0;
    let unlicensed = 0;
    let missingAw = 0;
    // Mocked values for others
    const passwordCompliance = Math.floor(devices.length * 0.95);
    const encrypted = Math.floor(devices.length * 0.90);

    devices.forEach(d => {
        if (d.esetStatus === 'inactive' || d.esetStatus === 'Inactive') missingEset++;
        if (d.activityWatchStatus === 'missing' || d.activityWatchStatus === 'Missing') missingAw++;
        if (!d.windowsKey) unlicensed++;
    });

    return [
        { name: 'Antivirus (ESET)', passed: devices.length - missingEset, failed: missingEset, total: devices.length },
        { name: 'ActivityWatch', passed: devices.length - missingAw, failed: missingAw, total: devices.length },
        { name: 'OS Licensing', passed: devices.length - unlicensed, failed: unlicensed, total: devices.length },
        { name: 'Password Compliance', passed: passwordCompliance, failed: devices.length - passwordCompliance, total: devices.length },
        { name: 'Device Encryption', passed: encrypted, failed: devices.length - encrypted, total: devices.length },
    ];
  }, [devices]);

  const nonCompliantAssets = useMemo(() => {
    const assets: any[] = [];
    devices.forEach(d => {
        const emp = employees.find(e => e.id === d.userId);
        const dept = emp ? (emp.accountAssignment || emp.account || 'Unassigned') : 'Unassigned';
        
        let issues = [];
        let risk = 'Low';

        if (d.esetStatus === 'inactive' || d.esetStatus === 'Inactive') {
            issues.push('Missing ESET');
            risk = 'Critical';
        }
        if (d.activityWatchStatus === 'missing' || d.activityWatchStatus === 'Missing') {
            issues.push('Missing AW');
            if (risk !== 'Critical') risk = 'High';
        }
        if (!d.windowsKey) {
            issues.push('Unlicensed OS');
            if (risk === 'Low') risk = 'Medium';
        }

        if (issues.length > 0) {
            assets.push({
                id: d.id,
                assetName: d.name,
                serialNumber: d.serialNumber,
                department: dept,
                issues: issues.join(', '),
                riskLevel: risk
            });
        }
    });
    return assets;
  }, [devices, employees]);

  const filteredAssets = useMemo(() => {
    return nonCompliantAssets.filter(a => 
      (a.assetName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
      (a.department || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (a.issues || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [nonCompliantAssets, debouncedSearchTerm]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Asset Name,Department,Compliance Issue,Risk Level\n" +
      filteredAssets.map(a => `"${a.assetName}","${a.department}","${a.issues}","${a.riskLevel}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `non_compliant_assets.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const RISK_COLORS: Record<string, string> = {
      'Critical': 'bg-red-100 text-red-700',
      'High': 'bg-orange-100 text-orange-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-gray-100 text-gray-700'
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Security Compliance"
      icon={<Shield className="w-6 h-6" />}
      redirectUrl="/assets"
      redirectLabel="Open Compliance Center"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center lg:col-span-1">
          <p className="text-sm font-bold text-[#111827] mb-6">Overall Compliance Score</p>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${parseFloat(stats.score) >= 90 ? 'text-[#10B981]' : parseFloat(stats.score) >= 75 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}
                strokeDasharray={`${stats.score}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-[#111827]">{stats.score}%</span>
              <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">Score</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] font-bold mt-6">{stats.compliantCount} of {stats.total} devices fully compliant</p>
        </div>

        {/* Compliance Categories */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold text-[#111827] mb-6">Compliance Categories</h3>
            <div className="space-y-4">
                {categories.map(cat => {
                    const pct = cat.total > 0 ? ((cat.passed / cat.total) * 100).toFixed(0) : 100;
                    return (
                        <div key={cat.name} className="flex flex-col gap-1">
                            <div className="flex justify-between items-end text-sm">
                                <span className="font-bold text-[#4B5563]">{cat.name}</span>
                                <span className="font-bold text-[#111827]">{pct}% <span className="text-xs text-[#9CA3AF]">({cat.passed}/{cat.total})</span></span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${parseInt(pct.toString()) >= 90 ? 'bg-[#10B981]' : parseInt(pct.toString()) >= 75 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Non-Compliant Assets Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#111827]">Non-Compliant Assets</h3>
            <span className="bg-red-100 text-red-700 text-xs font-black px-2 py-0.5 rounded-full">{nonCompliantAssets.length}</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input 
                type="text" 
                placeholder="Search issues..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                />
            </div>
            <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
                <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Asset</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Compliance Issue(s)</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">
                      <div>{asset.assetName}</div>
                      <div className="text-[0.625rem] text-[#6B7280] font-mono mt-0.5">{asset.serialNumber}</div>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{asset.department}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#EF4444]">{asset.issues}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${RISK_COLORS[asset.riskLevel] || RISK_COLORS['Low']}`}>
                      {asset.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">All assets are compliant!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
