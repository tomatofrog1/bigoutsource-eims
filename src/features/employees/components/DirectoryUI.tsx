import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronRight, CheckCircle2, Sparkles, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { AccountOption } from '@/src/features/employees/pages/Directory';

export function SectionCard({
  title,
  eyebrow,
  description,
  onEdit,
  status,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  onEdit?: () => void;
  status?: 'complete' | 'missing';
  children: ReactNode;
}) {
  return (
    <section className="h-full rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-lg shadow-[#1118270D]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.625rem] font-black uppercase tracking-widest text-[#2563EB]">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-black text-[#111827]">{title}</h3>
          {description && <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280]">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status && (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-wider border',
                status === 'complete' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
              )}
            >
              {status === 'complete' ? 'Complete' : 'Missing'}
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-[#D1D5DB] dark:border-[#3A4257] bg-white px-3 py-1.5 text-xs font-black text-[#4B5563] transition-all hover:bg-[#F9FAFB] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest text-[#6B7280]">
        {label}
        {required && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.5625rem] text-red-600 border border-red-100">Required</span>}
      </span>
      {children}
      {error && <span className="text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}

export function AccountDropdownGroup({
  title,
  accounts,
  onSelect,
}: {
  title: string;
  accounts: AccountOption[];
  onSelect: (account: AccountOption) => void;
}) {
  if (!accounts.length) return null;

  return (
    <div className="border-b border-[#F3F4F6] last:border-b-0">
      <div className="sticky top-0 bg-[#F9FAFB] px-3 py-2 text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">
        {title}
      </div>
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          onClick={() => onSelect(account)}
          className="flex w-full items-center justify-between gap-3 border-t border-[#F3F4F6] px-3 py-2.5 text-left text-sm font-bold text-[#111827] transition-all hover:bg-[#F9FAFB]"
        >
          <span className="truncate">{account.name}</span>
        </button>
      ))}
    </div>
  );
}

export function FilterDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-[132px] items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]"
      >
        <span className="truncate">{options.find((o) => o.value === value)?.label || placeholder || value}</span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-full w-max overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
            <div className="max-h-64 overflow-y-auto py-1">
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6]',
                      isSelected ? 'bg-[#EFF6FF]' : ''
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className={cn('truncate text-sm font-bold', isSelected ? 'text-[#2563EB]' : 'text-[#4B5563]')}>
                      {option.label}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AccountFilterDropdown({
  value,
  onChange,
  internalAccounts,
  externalAccounts,
}: {
  value: string;
  onChange: (value: string) => void;
  internalAccounts: AccountOption[];
  externalAccounts: AccountOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderOption = (optionValue: string, label: string) => {
    const isSelected = value === optionValue;
    return (
      <button
        key={optionValue}
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6]',
          isSelected ? 'bg-[#EFF6FF]' : ''
        )}
        onClick={() => {
          onChange(optionValue);
          setIsOpen(false);
        }}
      >
        <span className={cn('truncate text-sm font-bold', isSelected ? 'text-[#2563EB]' : 'text-[#4B5563]')}>
          {label}
        </span>
        {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />}
      </button>
    );
  };

  const selectedLabel = value === 'All Account' ? 'All Accounts' : value;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-[200px] items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#4B5563] outline-none transition-all hover:border-[#CBD5E1] focus:ring-2 focus:ring-[#111827]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-full w-max overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]">
            <div className="max-h-64 overflow-y-auto">
              <div className="py-1 border-b border-[#F3F4F6]">
                {renderOption('All Account', 'All Accounts')}
              </div>
              {internalAccounts.length > 0 && (
                <div className="border-b border-[#F3F4F6] last:border-b-0 pb-1">
                  <div className="sticky top-0 bg-[#F9FAFB] px-3 py-2 text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">
                    Internal
                  </div>
                  {internalAccounts.map((account) => renderOption(account.name, account.name))}
                </div>
              )}
              {externalAccounts.length > 0 && (
                <div className="border-b border-[#F3F4F6] last:border-b-0 pb-1">
                  <div className="sticky top-0 bg-[#F9FAFB] px-3 py-2 text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">
                    External
                  </div>
                  {externalAccounts.map((account) => renderOption(account.name, account.name))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  error = false,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#2563EB]',
        error ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' : 'border-[#D1D5DB] dark:border-[#3A4257]'
      )}
    />
  );
}

export function EditableGeneratedValue({
  label,
  value,
  onChange,
  onRegenerate,
  isEdited,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  isEdited: boolean;
  placeholder?: string;
  error?: string;
}) {
  const isReady = Boolean(value);

  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-all',
      error
        ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20'
        : isEdited
          ? 'border-amber-300 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10'
          : isReady
            ? 'border-[#BFDBFE] dark:border-[#2563EB]/20 bg-[#F8FAFF] dark:bg-[#2563EB]/10'
            : 'border-[#E5E7EB] bg-[#F9FAFB]'
    )}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className={cn('h-3.5 w-3.5 shrink-0', isReady ? 'text-[#2563EB]' : 'text-[#9CA3AF]')} />
          <p className="truncate text-[0.625rem] font-black uppercase tracking-widest text-[#6B7280]">{label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isEdited && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 animate-fade-in">
              Modified
            </span>
          )}
          {isReady && !isEdited && (
            <span className="rounded-full bg-white dark:bg-gray-800 px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#2563EB] dark:text-blue-400">
              Suggested
            </span>
          )}
          {isEdited && (
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-lg p-1 text-[#6B7280] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all flex items-center justify-center animate-fade-in"
              title="Reset to generated default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Pending generation'}
          className={cn(
            'w-full min-h-11 rounded-xl border px-3 py-2.5 text-sm font-bold bg-white text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]',
            error ? 'border-red-300 focus:ring-red-500' : 'border-[#D1D5DB] dark:border-[#3A4257] focus:border-[#2563EB]'
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-[0.625rem] font-bold text-red-600">{error}</p>}
    </div>
  );
}

export function GeneratedValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const isReady = Boolean(value);

  return (
    <div className={cn('rounded-2xl border p-4', isReady ? 'border-[#BFDBFE] dark:border-[#2563EB]/20 bg-[#F8FAFF] dark:bg-[#2563EB]/10' : 'border-[#E5E7EB] bg-[#F9FAFB]')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className={cn('h-3.5 w-3.5 shrink-0', isReady ? 'text-[#2563EB]' : 'text-[#9CA3AF]')} />
          <p className="truncate text-[0.625rem] font-black uppercase tracking-widest text-[#6B7280]">{label}</p>
        </div>
        {isReady && <span className="rounded-full bg-white px-2 py-1 text-[0.5625rem] font-black uppercase tracking-widest text-[#2563EB]">Generated</span>}
      </div>
      <p
        className={cn(
          'flex min-h-11 items-center rounded-xl border px-3 py-2.5 text-sm font-black',
          isReady
            ? 'border-[#DBEAFE] dark:border-[#2563EB]/30 bg-white text-[#111827]'
            : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
        )}
      >
        {value || '-'}
      </p>
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#2563EB]',
        error ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' : 'border-[#D1D5DB] dark:border-[#3A4257]'
      )}
    >
      {children}
    </select>
  );
}

export function ReviewGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <dt className="text-[0.625rem] font-black uppercase tracking-widest text-[#9CA3AF]">{label}</dt>
          <dd className="mt-1 break-words text-sm font-black text-[#111827]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
