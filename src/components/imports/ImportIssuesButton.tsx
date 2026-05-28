import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { employeeImportService } from '@/src/services/employeeImportService';

export function ImportIssuesButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
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
  }, []);

  if (!count) return null;

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
