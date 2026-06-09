import React, { useEffect, useState } from 'react';
import { ChevronRight, Eye, EyeOff, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Shared presentational form fields used by both the login form and the
 * registration wizard. Kept in one place so the registration modal in User
 * Management looks identical to the logged-out registration screen.
 */

export function AuthInput({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] peer-focus:text-[#111827] transition-colors pointer-events-none" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="peer w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[0.9375rem] focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none placeholder:text-gray-400 shadow-sm shadow-gray-900/5"
        />
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold text-[#DC2626] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SelectInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  options,
  error,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  error?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#111827] transition-colors z-10 pointer-events-none" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-gray-50 py-3.5 pl-11 pr-4 text-left text-[0.9375rem] outline-none transition-all shadow-sm shadow-gray-900/5 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-[#DC2626] ring-4 ring-red-500/10 bg-red-50' : 'border-gray-200'
            }`}
        >
          <span className={`truncate ${!value ? 'text-gray-400' : 'text-[#111827]'}`}>
            {value || placeholder}
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${isOpen ? 'rotate-90' : ''
              }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
              >
                <div className="max-h-64 overflow-y-auto">
                  {options.length > 0 ? (
                    options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          onChange(option);
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6] focus:bg-[#F3F4F6] outline-none"
                      >
                        {option}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-bold text-[#6B7280]">
                      No options available
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold text-[#DC2626] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PasswordInput({
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder = 'Enter password',
  minLength = 1,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
  minLength?: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] peer-focus:text-[#111827] transition-colors pointer-events-none" />
        <input
          type={showPassword ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="peer w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[0.9375rem] focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none placeholder:text-gray-400 shadow-sm shadow-gray-900/5"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#111827] transition-colors"
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold text-[#DC2626] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
