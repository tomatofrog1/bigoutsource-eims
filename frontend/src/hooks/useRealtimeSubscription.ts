import { useEffect } from 'react';
// Types mock to prevent TS errors
type RealtimePostgresChangesPayload<T> = any;

type RealtimeConfig = {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onChange: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
};

export function useRealtimeSubscription({
  table,
  schema = 'public',
  event = '*',
  onChange,
  enabled = true
}: RealtimeConfig) {
  useEffect(() => {
    if (!enabled) return;

    // Supabase Realtime removed in self-hosted migration.
    // Fallback polling for live updates.
    const interval = setInterval(() => {
      onChange({} as any);
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, onChange]);
}
