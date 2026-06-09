import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SkeletonLoadingMessageProps {
  message: string;
  delayMs?: number;
}

export function SkeletonLoadingMessage({ message, delayMs = 1000 }: SkeletonLoadingMessageProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delayMs);
    
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border border-[#E5E7EB] text-[#111827] shadow-sm pointer-events-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#111827] animate-pulse mr-2.5" />
          <span className="text-[0.625rem] font-black uppercase tracking-widest text-[#4B5563]">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
