import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

    let channel: RealtimeChannel;

    try {
      // Create a unique channel name to avoid conflicts if multiple components subscribe to the same table
      const channelName = `realtime:${schema}:${table}:${Math.random().toString(36).substring(7)}`;
      
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event, schema, table },
          (payload) => {
            onChange(payload);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error(`[useRealtimeSubscription] Error subscribing to ${table}:`, err);
          }
          if (status === 'SUBSCRIBED') {
            console.log(`[useRealtimeSubscription] Successfully subscribed to ${table} (${event})`);
          }
        });
    } catch (err) {
      console.error(`[useRealtimeSubscription] Exception subscribing to ${table}:`, err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, schema, event, onChange, enabled]);
}
