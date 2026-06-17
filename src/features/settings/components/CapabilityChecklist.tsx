import { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { CapabilityItem } from '@/src/features/settings/services/roleService';

const DOMAIN_LABELS: Record<string, string> = {
  employees: 'Employees',
  assets: 'IT Assets',
  departments: 'Departments',
  sites: 'Sites',
  imports: 'Imports',
  reports: 'Reports',
  auditlogs: 'Audit Logs',
  notifications: 'Notifications',
};

function domainOf(key: string) {
  return key.split('.')[0];
}

/**
 * Capability picker grouped by domain. Shared by the role editor and the
 * per-account permission override modal so both look and behave identically.
 */
export function CapabilityChecklist({
  catalog,
  selected,
  onToggle,
  readOnly = false,
}: {
  catalog: CapabilityItem[];
  selected: string[];
  onToggle: (key: string) => void;
  readOnly?: boolean;
}) {
  const grouped = useMemo(() => {
    const byDomain = new Map<string, CapabilityItem[]>();
    for (const item of catalog) {
      const domain = domainOf(item.key);
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain)!.push(item);
    }
    return [...byDomain.entries()].map(([domain, items]) => ({
      domain,
      label: DOMAIN_LABELS[domain] || domain,
      items,
    }));
  }, [catalog]);

  return (
    <div className="space-y-5">
      {grouped.map((group) => (
        <div key={group.domain}>
          <h4 className="mb-2 text-[0.6875rem] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-faint)' }}>
            {group.label}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.items.map((item) => {
              const checked = selected.includes(item.key);
              return (
                <label
                  key={item.key}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-[#F9FAFB]'}`}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
                    style={checked ? { backgroundColor: '#111827', borderColor: '#111827' } : { borderColor: 'var(--color-border)' }}
                  >
                    {checked && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => onToggle(item.key)}
                  />
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
