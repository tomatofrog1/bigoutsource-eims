import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { employeeImportService } from '@/src/services/employeeImportService';

let cachedImportIssueCount = 0;

export function ImportIssuesButton() {
  const { user } = useAuth();
  const [count, setCount] = useState(cachedImportIssueCount);
  const role = user?.role;

  useEffect(() => {
    if (!user || role === 'viewer' || role === 'it_admin') {
      cachedImportIssueCount = 0;
      setCount(0);
      return;
    }

    let isMounted = true;

    async function loadSummary() {
      try {
        const summary = await employeeImportService.summary();
        const nextCount = Number(summary.unresolvedIssues || 0);
        cachedImportIssueCount = nextCount;
        if (isMounted) setCount(nextCount);
      } catch (error) {
        if (isMounted) setCount(cachedImportIssueCount);
      }
    }

    loadSummary();
    const intervalId = window.setInterval(loadSummary, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [role, user?.uid]);

  if (count <= 0) return null;

  return (
    <Link
      to="/employee-imports/issues"
      title={`Import Issues (${count})`}
      aria-label={`Import Issues (${count})`}
      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-[#DC2626] transition-colors hover:bg-red-100"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">Import Issues</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  );
}
