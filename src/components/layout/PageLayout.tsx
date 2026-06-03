import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  contentClassName?: string;
}

export function PageLayout({ children, title, contentClassName = 'max-w-6xl mx-auto' }: PageLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-[#F9FAFB] overflow-hidden relative">
      {/* Natural ambient background lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-400/10 blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-300/10 blur-[140px] pointer-events-none z-0" />
      
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header title={title} />
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={contentClassName}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        </div>
      </div>
    </div>
  );
}
