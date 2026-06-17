import { ArrowLeft } from 'lucide-react';
import { useAppBack } from '@/src/hooks/useAppBack';

interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
}

export function BackButton({ fallback = '/', label = 'Back', className = '' }: BackButtonProps) {
  const goBack = useAppBack();

  return (
    <button
      type="button"
      onClick={() => goBack(fallback)}
      className={`flex items-center gap-2 text-sm font-bold text-[#6B7280] hover:text-[#111827] transition-colors w-fit uppercase tracking-tighter outline-none ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
