import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, ShieldAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { settingsService } from '@/src/services/settingsService';
import { userService } from '@/src/services/userService';
import { AppUser } from '@/src/types';

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
    <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-8">
      <h1 className="text-lg font-semibold text-[#111827]">{title}</h1>
      
      <div className="flex items-center gap-6">
        
        
        <div className="flex items-center gap-4">
          <NotificationBell />
          
          <div className="flex items-center gap-3 pl-4 border-l border-[#E5E7EB]">
            <div className="text-right">
              <p className="text-sm font-medium text-[#111827]">{name}</p>
              <p className="text-xs text-[#6B7280]">{user?.role?.replace('_', ' ') || 'User'}</p>
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
  const [notifyRegistrationAttempts, setNotifyRegistrationAttempts] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [seenPendingIds, setSeenPendingIds] = useState<Set<string>>(() => readSeenPendingRegistrationIds());
  const [activeNotificationIds, setActiveNotificationIds] = useState<Set<string>>(new Set());

  const isSuperAdmin = user?.role === 'super_admin';

  const pendingUsers = useMemo(
    () => users.filter((account) => account.status === 'pending'),
    [users]
  );

  const unreadPendingUsers = useMemo(
    () => pendingUsers.filter((account) => !seenPendingIds.has(String(account.uid))),
    [pendingUsers, seenPendingIds]
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
    if (!isSuperAdmin) {
      setNotifyRegistrationAttempts(false);
      setUsers([]);
      setActiveNotificationIds(new Set());
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);

      try {
        const [settings, accountList] = await Promise.all([settingsService.get(), userService.list()]);
        if (!isMounted) return;

        const nextUsers = Array.isArray(accountList) ? accountList : [];
        setNotifyRegistrationAttempts(Boolean(settings.notifyRegistrationAttempts));
        setUsers(nextUsers);
        window.dispatchEvent(new CustomEvent(USER_ACCOUNTS_REFRESHED_EVENT, { detail: { users: nextUsers } }));
      } catch (error) {
        if (!isMounted) return;

        setNotifyRegistrationAttempts(false);
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
  }, [isSuperAdmin]);

  return (
    <>
      <button
        type="button"
        onClick={openNotifications}
        className="relative rounded-full p-2 text-[#4B5563] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
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
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4">
              <div>
                <h2 className="text-base font-black text-[#111827]">Notifications</h2>
                <p className="mt-1 text-xs font-bold text-[#6B7280]">
                  {unreadCount > 0 ? `${unreadCount} pending item${unreadCount === 1 ? '' : 's'}` : 'No pending alerts'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
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
                <NotificationEmptyState message="Notifications for account requests are available to Super Admin users." />
              ) : !notifyRegistrationAttempts ? (
                <NotificationEmptyState message="Registration attempt notifications are turned off in Settings." />
              ) : pendingUsers.length > 0 ? (
                <div className="space-y-3">
                  {pendingUsers.map((account) => (
                    <div
                      key={account.uid}
                      className={`rounded-xl border p-4 transition-colors ${
                        activeNotificationIds.has(String(account.uid))
                          ? 'border-amber-200 bg-amber-50 shadow-sm'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-xl p-2 ${
                            activeNotificationIds.has(String(account.uid))
                              ? 'bg-white text-amber-700'
                              : 'bg-[#F9FAFB] text-[#6B7280]'
                          }`}
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-[#111827]">Account request pending</p>
                            {activeNotificationIds.has(String(account.uid)) && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs font-bold text-[#6B7280]">{account.fullName || account.email}</p>
                          <p className="mt-0.5 truncate text-[11px] font-bold text-[#9CA3AF]">{account.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <NotificationEmptyState message="No account requests are waiting for approval." />
              )}
            </div>

            {isSuperAdmin && notifyRegistrationAttempts && pendingUsers.length > 0 && (
              <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
                <Link
                  to="/users"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#374151]"
                >
                  Review Requests
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NotificationEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] px-6 text-center">
      <Bell className="h-7 w-7 text-[#D1D5DB]" />
      <p className="mt-3 text-sm font-black text-[#111827]">All clear</p>
      <p className="mt-1 text-xs font-bold text-[#6B7280]">{message}</p>
    </div>
  );
}
