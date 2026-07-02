import { useEffect, useState } from 'react';
import { AppUser } from '../types';
import { connectPresenceSocket } from '../services/realtimeService';

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

    const cleanup = connectPresenceSocket({
      onSync: (users: PresenceUser[]) => {
        setOnlineUsers(users);
      },
      onJoin: (user: PresenceUser) => {
        setOnlineUsers((prev) => {
          if (prev.some((u) => u.user_id === user.user_id)) return prev;
          return [...prev, user];
        });
      },
      onLeave: ({ user_id }: { user_id: string }) => {
        setOnlineUsers((prev) => prev.filter((u) => u.user_id !== user_id));
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentUser?.uid]);

  return { onlineUsers };
}
