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
    // Supabase Realtime removed in self-hosted migration.
    // We could implement polling or socket.io rooms here later.
  }, [table, schema, event, onChange, enabled]);
}
