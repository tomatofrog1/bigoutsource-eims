import { useMemo, useState } from 'react';
import { UserPlus, Download } from 'lucide-react';
import { BaseDashboardModal } from './BaseDashboardModal';

interface RecentHiresPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentHires: any[];
}

export function RecentHiresPipelineModal({ isOpen, onClose, recentHires }: RecentHiresPipelineModalProps) {
  // Since there is no explicit Recruitment module data yet, we mock the pipeline data
  // but use the actual recentHires for the "Hired" stage.
  const pipelineStats = useMemo(() => {
    const hired = recentHires.length;
    return {
      applicants: hired * 15,
      screening: hired * 8,
      interview: hired * 4,
      assessment: hired * 2,
      hired: hired,
      conversionRate: hired > 0 ? ((1 / 15) * 100).toFixed(1) : '0.0',
      timeToHire: '18 Days',
      openPositions: 12
    };
  }, [recentHires]);

  const mockCandidates = useMemo(() => {
    // Generate some mock active candidates in the pipeline
    return [
      { id: 1, name: 'Alice Smith', position: 'Software Engineer', stage: 'Interview', recruiter: 'John Doe' },
      { id: 2, name: 'Bob Jones', position: 'Data Analyst', stage: 'Assessment', recruiter: 'Jane Roe' },
      { id: 3, name: 'Charlie Brown', position: 'Product Manager', stage: 'Screening', recruiter: 'John Doe' },
      { id: 4, name: 'Diana Prince', position: 'UX Designer', stage: 'Interview', recruiter: 'Jane Roe' },
      { id: 5, name: 'Evan Wright', position: 'DevOps Engineer', stage: 'Screening', recruiter: 'John Doe' },
    ];
  }, []);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Candidate,Position,Current Stage,Recruiter\n" +
      mockCandidates.map(c => `"${c.name}","${c.position}","${c.stage}","${c.recruiter}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pipeline_candidates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const STAGE_COLORS: Record<string, string> = {
      'Screening': 'bg-blue-100 text-blue-700',
      'Interview': 'bg-purple-100 text-purple-700',
      'Assessment': 'bg-yellow-100 text-yellow-700',
      'Hired': 'bg-green-100 text-green-700'
  };

  return (
    <BaseDashboardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Recent Hire Pipeline"
      icon={<UserPlus className="w-6 h-6" />}
      redirectUrl="/reports"
      redirectLabel="Open Recruitment Module"
    >
      {/* Recruitment Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Conversion Rate</p>
          <p className="text-4xl font-black mt-2 text-[#10B981]">{pipelineStats.conversionRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Avg Time-to-Hire</p>
          <p className="text-4xl font-black mt-2 text-[#3B82F6]">{pipelineStats.timeToHire}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">Open Positions</p>
          <p className="text-4xl font-black mt-2 text-[#F59E0B]">{pipelineStats.openPositions}</p>
        </div>
      </div>

      {/* Recruitment Funnel */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
        <h3 className="text-sm font-bold text-[#111827] mb-6">Recruitment Funnel</h3>
        <div className="flex flex-col gap-3">
            {[
                { label: 'Applicants', value: pipelineStats.applicants, color: 'bg-gray-100', text: 'text-gray-700', width: '100%' },
                { label: 'Screening', value: pipelineStats.screening, color: 'bg-blue-100', text: 'text-blue-700', width: '80%' },
                { label: 'Interview', value: pipelineStats.interview, color: 'bg-purple-100', text: 'text-purple-700', width: '60%' },
                { label: 'Assessment', value: pipelineStats.assessment, color: 'bg-yellow-100', text: 'text-yellow-700', width: '40%' },
                { label: 'Hired', value: pipelineStats.hired, color: 'bg-green-100', text: 'text-green-700', width: '20%' },
            ].map(stage => (
                <div key={stage.label} className="w-full flex justify-center">
                    <div 
                        className={`flex items-center justify-between px-6 py-3 rounded-lg ${stage.color} ${stage.text}`}
                        style={{ width: stage.width, minWidth: '200px' }}
                    >
                        <span className="text-xs font-black uppercase tracking-wider">{stage.label}</span>
                        <span className="text-lg font-black">{stage.value}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#111827]">Active Candidates in Pipeline</h3>
          <button onClick={handleExport} className="p-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] text-[#4B5563]" title="Export">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Candidate</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Position</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Current Stage</th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Recruiter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {mockCandidates.map(c => (
                <tr key={c.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-3 text-sm font-bold text-[#111827]">{c.name}</td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{c.position}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${STAGE_COLORS[c.stage]}`}>
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#4B5563]">{c.recruiter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BaseDashboardModal>
  );
}
