import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppUser } from '../types';

export interface PresenceUser {
  user_id: string;
  email: string;
  full_name: string;
  online_at: string;
}

export function usePresence(currentUser: AppUser | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setOnlineUsers([]);
      return;
    }

    const room = supabase.channel('global:presence', {
      config: {
        presence: {
          key: currentUser.uid,
        },
      },
    });

    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        const users: PresenceUser[] = [];
        
        // Extract unique users from presence state
        for (const key in state) {
          if (state[key] && state[key].length > 0) {
            // Assume the first presence object has the info we need
            const info = state[key][0] as PresenceUser;
            if (info && info.user_id) {
              // Deduplicate in case of multiple tabs (same user_id)
              if (!users.some(u => u.user_id === info.user_id)) {
                users.push(info);
              }
            }
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const status = await room.track({
            user_id: currentUser.uid,
            email: currentUser.email,
            full_name: currentUser.fullName,
            online_at: new Date().toISOString(),
          });
          if (status !== 'ok') {
            console.error('[usePresence] Failed to track presence:', status);
          }
        }
      });

    return () => {
      supabase.removeChannel(room);
    };
  }, [currentUser?.uid, currentUser?.email, currentUser?.fullName]);

  return { onlineUsers };
}
