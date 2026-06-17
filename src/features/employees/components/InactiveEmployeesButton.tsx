import { useEffect, useState } from 'react';
import { UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { employeeService } from '@/src/features/employees/services/employeeService';

let cachedInactiveCount = 0;

export function InactiveEmployeesButton() {
  const { user, can } = useAuth();
  const [count, setCount] = useState(cachedInactiveCount);
  const canViewEmployees = can('employees.view');

  useEffect(() => {
    if (!canViewEmployees) {
      cachedInactiveCount = 0;
      setCount(0);
      return;
    }

    let isMounted = true;

    async function loadSummary() {
      try {
        const summary = await employeeService.summary();
        const nextCount = Number(summary.inactiveUnarchived || 0);
        cachedInactiveCount = nextCount;
        if (isMounted) setCount(nextCount);
      } catch (error) {
        if (isMounted) setCount(cachedInactiveCount);
      }
    }

    loadSummary();
    const intervalId = window.setInterval(loadSummary, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [canViewEmployees, user?.uid]);

  if (count <= 0) return null;

  return (
    <Link
      to="/directory?status=Inactive"
      title={`Inactive Employees not yet archived (${count})`}
      aria-label={`Inactive Employees not yet archived (${count})`}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <UserX className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">Inactive</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-600 dark:bg-slate-500 px-1.5 text-[0.625rem] font-black text-white">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  );
}
