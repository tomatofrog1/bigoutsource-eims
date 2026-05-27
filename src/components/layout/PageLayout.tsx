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
    <div className="flex h-screen w-full bg-[#F9FAFB] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={contentClassName}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
