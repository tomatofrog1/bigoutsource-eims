import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { employeeImportService } from '@/src/services/employeeImportService';

export function ImportIssuesButton() {
  const { user } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'viewer' || user.role === 'it_admin') {
      setCount(0);
      return;
    }

    let isMounted = true;

    async function loadSummary() {
      try {
        const summary = await employeeImportService.summary();
        if (isMounted) setCount(Number(summary.unresolvedIssues || 0));
      } catch (error) {
        if (isMounted) setCount(0);
      }
    }

    loadSummary();
    const intervalId = window.setInterval(loadSummary, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  if (!count || location.pathname.startsWith('/employee-imports')) return null;

  return (
    <Link
      to="/employee-imports/issues"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-red-600/30 transition-all hover:bg-red-700"
    >
      <AlertTriangle className="h-4 w-4" />
      Import Issues ({count})
    </Link>
  );
}
