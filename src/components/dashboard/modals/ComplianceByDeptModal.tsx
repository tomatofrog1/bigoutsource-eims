import { useMemo, useState } from 'react';
import { FileCheck, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';

interface ComplianceByDeptModalProps {
  isOpen: boolean;
  onClose: () => void;
  complianceByDepartment: any[]; // {name, Compliant, NonCompliant, total}
}

export function ComplianceByDeptModal({ isOpen, onClose, complianceByDepartment }: ComplianceByDeptModalProps) {
  
  const deptData = useMemo(() => {
    return complianceByDepartment.map(d => {
        const pct = d.total > 0 ? ((d.Compliant / d.total) * 100).toFixed(1) : '100.0';
        return {
            ...d,
            complianceScore: parseFloat(pct)
        };
    }).sort((a, b) => b.complianceScore - a.complianceScore);
  }, [complianceByDepartment]);

  // Mock historical trends based on the current overall data
  const historicalTrends = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let baseScore = deptData.reduce((acc, curr) => acc + curr.complianceScore, 0) / (deptData.length || 1);
    if (isNaN(baseScore)) baseScore = 85;

    return months.map((month, i) => {
        // Create a slight upward trend towards the current baseScore
        const score = Math.min(100, Math.max(0, baseScore - (5 - i) * 1.5 + (Math.random() * 2 - 1)));
        return {
            month,
            score: parseFloat(score.toFixed(1))
        };
    });
  }, [deptData]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Department,Compliance %,Passed Devices,Failed Devices\n" +
      deptData.map(d => `"${d.name}","${d.complianceScore}%","${d.Compliant}","${d.NonCompliant}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `compliance_by_dept.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Compliance by Department"
      icon={<FileCheck className="w-6 h-6" />}
      redirectUrl="/assets"
      redirectLabel="Open Compliance Center"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Ranking Chart */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4">Department Ranking (Score %)</h3>
          <div className="flex-1 min-h-[250px]">
            {deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#111827' }} width={100} />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="complianceScore" name="Compliance Score" radius={[0, 4, 4, 0]} barSize={24}>
                        {deptData.map((d, index) => (
                            <Cell key={`cell-${index}`} fill={d.complianceScore >= 90 ? '#10B981' : d.complianceScore >= 75 ? '#F59E0B' : '#EF4444'} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-[#9CA3AF] text-sm font-bold">No department data available.</div>
            )}
          </div>
        </div>

        {/* Historical Compliance Trends */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-[#111827] mb-4">Overall Compliance Trends (6 Months)</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="score" name="Avg Score %" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#111827]">Department Performance Breakdown</h3>
          <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Department</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Compliance %</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Compliant Devices</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Non-Compliant Devices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {deptData.map(dept => (
                <tr key={dept.name} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{dept.name}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${
                        dept.complianceScore >= 90 ? 'bg-green-100 text-green-700' :
                        dept.complianceScore >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                      {dept.complianceScore}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-[#10B981]">{dept.Compliant}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#EF4444]">{dept.NonCompliant}</td>
                </tr>
              ))}
              {deptData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280] text-sm font-medium">No department compliance data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
