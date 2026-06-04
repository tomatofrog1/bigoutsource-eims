import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, ShieldAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { settingsService } from '@/src/services/settingsService';
import { userService } from '@/src/services/userService';
import { AppUser } from '@/src/types';
import { ImportIssuesButton } from '@/src/components/imports/ImportIssuesButton';

const SEEN_PENDING_REGISTRATIONS_KEY = 'eims_seen_pending_registration_ids';
const NOTIFICATION_REFRESH_MS = 10000;
export const USER_ACCOUNTS_REFRESHED_EVENT = 'eims:user-accounts-refreshed';

function readSeenPendingRegistrationIds() {
  try {
    const saved = localStorage.getItem(SEEN_PENDING_REGISTRATIONS_KEY);
    const ids = saved ? JSON.parse(saved) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch (error) {
    return new Set<string>();
  }
}

function saveSeenPendingRegistrationIds(ids: Set<string>) {
  localStorage.setItem(SEEN_PENDING_REGISTRATIONS_KEY, JSON.stringify(Array.from(ids)));
}

export function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const name = user?.fullName || user?.email || 'User';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <header className="h-16 border-b flex items-center justify-between px-8" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
      
      <div className="flex items-center gap-6">
        
        
        <div className="flex items-center gap-4">
          <ImportIssuesButton />
          <NotificationBell />
          
          <div className="flex items-center gap-3 pl-4 border-l" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{user?.role?.replace('_', ' ') || 'User'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifyRegistrationAttempts, setNotifyRegistrationAttempts] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [seenPendingIds, setSeenPendingIds] = useState<Set<string>>(() => readSeenPendingRegistrationIds());
  const [activeNotificationIds, setActiveNotificationIds] = useState<Set<string>>(new Set());

  const isSuperAdmin = user?.role === 'super_admin';

  const pendingUsers = useMemo(
    () => users.filter((account) => account.status === 'pending'),
    [users]
  );

  const accountRequestNotifications = notifyRegistrationAttempts ? pendingUsers : [];

  const unreadPendingUsers = useMemo(
    () => accountRequestNotifications.filter((account) => !seenPendingIds.has(String(account.uid))),
    [accountRequestNotifications, seenPendingIds]
  );

  const unreadCount = isSuperAdmin && notifyRegistrationAttempts ? unreadPendingUsers.length : 0;

  const openNotifications = () => {
    setIsOpen(true);

    if (!unreadPendingUsers.length) {
      setActiveNotificationIds(new Set());
      return;
    }

    const unreadIds = new Set(unreadPendingUsers.map((account) => String(account.uid)));
    const nextSeenIds = new Set(seenPendingIds);
    unreadIds.forEach((id) => nextSeenIds.add(id));
    saveSeenPendingRegistrationIds(nextSeenIds);
    setSeenPendingIds(nextSeenIds);
    setActiveNotificationIds(unreadIds);
  };

  useEffect(() => {
    if (!isSuperAdmin && user?.role !== 'admin') {
      setNotifyRegistrationAttempts(false);
      setUsers([]);
      setActiveNotificationIds(new Set());
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);

      try {
        const [settingsResult, accountListResult] = await Promise.allSettled([settingsService.get(), userService.list()]);
        if (!isMounted) return;

        if (settingsResult.status === 'fulfilled') {
          setNotifyRegistrationAttempts(Boolean(settingsResult.value.notifyRegistrationAttempts));
        }

        const nextUsers = accountListResult.status === 'fulfilled' && Array.isArray(accountListResult.value) ? accountListResult.value : [];
        setUsers(nextUsers);
        window.dispatchEvent(new CustomEvent(USER_ACCOUNTS_REFRESHED_EVENT, { detail: { users: nextUsers } }));
      } catch (error) {
        if (!isMounted) return;

        setUsers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, NOTIFICATION_REFRESH_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isSuperAdmin, user?.role]);

  return (
    <>
      <button
        type="button"
        onClick={openNotifications}
        className="relative rounded-full p-2 transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#EF4444] px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-end bg-[#111827]/30 px-4 py-20 sm:px-8"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Notifications</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 transition-colors"
                style={{ color: 'var(--color-text-faint)' }}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[28rem] overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
                </div>
              ) : !isSuperAdmin ? (
                <NotificationEmptyState message="Notifications are available to Super Admin users." />
              ) : accountRequestNotifications.length > 0 ? (
                <div className="space-y-3">
                  {accountRequestNotifications.map((account) => (
                    <Link
                      key={account.uid}
                      to="/users"
                      onClick={() => setIsOpen(false)}
                      className="block rounded-xl border p-4 text-left transition-colors hover:border-[#111827] hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                      style={
                        activeNotificationIds.has(String(account.uid))
                          ? { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' }
                          : { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="rounded-xl p-2"
                          style={
                            activeNotificationIds.has(String(account.uid))
                              ? { color: '#F59E0B' }
                              : { backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)' }
                          }
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Account request pending</p>
                            {activeNotificationIds.has(String(account.uid)) && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}>
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>{account.fullName || account.email}</p>
                          <p className="mt-0.5 truncate text-[11px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{account.email}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <NotificationEmptyState message="No notifications right now." />
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NotificationEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center" style={{ borderColor: 'var(--color-border)' }}>
      <Bell className="h-7 w-7" style={{ color: 'var(--color-border)' }} />
      <p className="mt-3 text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>All clear</p>
      <p className="mt-1 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
    </div>
  );
}
