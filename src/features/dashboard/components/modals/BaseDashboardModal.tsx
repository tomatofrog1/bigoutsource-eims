import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BaseDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  redirectUrl?: string;
  redirectLabel?: string;
}

export function BaseDashboardModal({ 
  isOpen, 
  onClose, 
  title, 
  icon,
  children,
  redirectUrl,
  redirectLabel
}: BaseDashboardModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-[#E5E7EB]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#F3F4F6] bg-white relative z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#EEF2FF] rounded-xl text-[#6366F1] shadow-sm border border-[#E0E7FF]">
                {icon}
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#111827]">{title}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {redirectUrl && redirectLabel && (
                <Link
                  to={redirectUrl}
                  onClick={onClose}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#6366F1] rounded-xl hover:bg-[#4F46E5] shadow-sm hover:shadow transition-all"
                >
                  {redirectLabel}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={onClose}
                className="p-2 text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto bg-[#F9FAFB] p-6 space-y-8">
            {children}
            
            {/* Mobile Redirect Button */}
            {redirectUrl && redirectLabel && (
              <div className="sm:hidden mt-6 pt-6 border-t border-[#E5E7EB]">
                <Link
                  to={redirectUrl}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-white bg-[#6366F1] rounded-xl hover:bg-[#4F46E5] shadow-sm transition-all"
                >
                  {redirectLabel}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
