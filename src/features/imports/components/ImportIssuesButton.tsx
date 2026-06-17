import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { employeeImportService } from '@/src/features/imports/services/employeeImportService';

let cachedPendingImportsCount = 0;

export function ImportIssuesButton() {
  const { user, can } = useAuth();
  const [count, setCount] = useState(cachedPendingImportsCount);
  const canManageImports = can('imports.manage');

  useEffect(() => {
    if (!canManageImports) {
      cachedPendingImportsCount = 0;
      setCount(0);
      return;
    }

    let isMounted = true;

    async function loadSummary() {
      try {
        const summary = await employeeImportService.summary();
        const nextCount = Number(summary.pendingImports || 0);
        cachedPendingImportsCount = nextCount;
        if (isMounted) setCount(nextCount);
      } catch (error) {
        if (isMounted) setCount(cachedPendingImportsCount);
      }
    }

    loadSummary();
    const intervalId = window.setInterval(loadSummary, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [canManageImports, user?.uid]);

  if (count <= 0) return null;

  return (
    <Link
      to="/employee-imports/issues"
      title={`Pending Imports (${count})`}
      aria-label={`Pending Imports (${count})`}
      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-500 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/40"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">Pending Imports</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 dark:bg-amber-500 px-1.5 text-[0.625rem] font-black text-white dark:text-amber-950">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  );
}
