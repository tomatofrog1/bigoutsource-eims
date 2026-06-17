import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Column {
  key: string;
  label: string;
  render?: (val: any, row: any) => React.ReactNode;
}

export interface ReportInsight {
  label: string;
  value: string | number;
  colorClass?: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  data: any[];
  columns: Column[];
  insights?: ReportInsight[];
  viewAllLink?: string;
}

export function ReportModal({ isOpen, onClose, title, description, data, columns, insights, viewAllLink }: ReportModalProps) {
  if (!isOpen) return null;

  const displayData = data.slice(0, 10);
  const hasMore = data.length > 10;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[85vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-[#F3F4F6] bg-white relative z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#EEF2FF] rounded-xl text-[#6366F1]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#111827]">{title}</h2>
                <p className="text-sm font-bold text-[#6B7280]">
                  {data.length} total records {hasMore ? '(showing top 10)' : ''}
                </p>
                {description && (
                  <p className="text-sm text-[#4B5563] mt-1 italic">{description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8," + 
                    columns.map(c => c.label).join(",") + "\n" +
                    data.map(row => columns.map(c => {
                        let val = row[c.key];
                        if (typeof val === 'object') val = '';
                        return `"${val || ''}"`;
                    }).join(",")).join("\n");
                  
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] hover:text-[#111827] transition-all"
              >
                <Download className="w-4 h-4" />
                Export Full List
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[#F9FAFB] p-6 space-y-6">
            {insights && insights.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
                    <p className="text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280] mb-1">{insight.label}</p>
                    <p className={`text-2xl font-black ${insight.colorClass || 'text-[#111827]'}`}>{insight.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {columns.map((col) => (
                      <th key={col.key} className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#6B7280]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {displayData.length > 0 ? (
                    displayData.map((row, i) => (
                      <tr key={row.id || i} className="hover:bg-[#F9FAFB] transition-colors">
                        {columns.map((col) => (
                          <td key={col.key} className="px-6 py-4 text-sm font-medium text-[#111827]">
                            {col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-12 text-center text-[#6B7280] font-bold">
                        No records found for this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {hasMore && viewAllLink && (
                <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex justify-center">
                  <Link 
                    to={viewAllLink}
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#6366F1] bg-white border border-[#6366F1] rounded-xl hover:bg-[#EEF2FF] transition-all"
                  >
                    View All {data.length} Records
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
