import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, ShieldAlert, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { settingsService } from '@/src/features/settings/services/settingsService';
import { userService } from '@/src/services/userService';
import { notificationService } from '@/src/services/notificationService';
import { AppUser } from '@/src/types';
import { ImportIssuesButton } from '@/src/features/imports/components/ImportIssuesButton';
import { InactiveEmployeesButton } from '@/src/features/employees/components/InactiveEmployeesButton';
import { BackButton } from '@/src/common/components/layout/BackButton';

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

function formatNotificationTimestamp(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function Header({ title, backFallback }: { title: string, backFallback?: string }) {
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
      <div className="flex items-center gap-4">
        {backFallback && <BackButton fallback={backFallback} />}
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
      </div>
      
      <div className="flex items-center gap-6">
        
        
        <div className="flex items-center gap-4">
          <ImportIssuesButton />
          <InactiveEmployeesButton />
          <NotificationBell />
          
          <div className="flex items-center gap-3 pl-4 border-l" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{user?.role?.replace('_', ' ') || 'User'}</p>
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
  const { can } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [notifyRegistrationAttempts, setNotifyRegistrationAttempts] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [employeeNotifications, setEmployeeNotifications] = useState<any[]>([]);
  const [seenPendingIds, setSeenPendingIds] = useState<Set<string>>(() => readSeenPendingRegistrationIds());
  const [activeNotificationIds, setActiveNotificationIds] = useState<Set<string>>(new Set());
  const [activeEmployeeNotificationIds, setActiveEmployeeNotificationIds] = useState<Set<string>>(new Set());

  const canManageUsers = can('users.manage');
  const canReceiveEmployeeAddedNotifications = can('notifications.employee_added');

  const pendingUsers = useMemo(
    () => users.filter((account) => account.status === 'pending'),
    [users]
  );

  const accountRequestNotifications = notifyRegistrationAttempts ? pendingUsers : [];

  const unreadPendingUsers = useMemo(
    () => accountRequestNotifications.filter((account) => !seenPendingIds.has(String(account.uid))),
    [accountRequestNotifications, seenPendingIds]
  );

  const unreadEmployeeNotifications = useMemo(
    () => employeeNotifications.filter((notification) => !notification.readAt),
    [employeeNotifications]
  );

  const unreadCount =
    (canManageUsers && notifyRegistrationAttempts ? unreadPendingUsers.length : 0) +
    (canReceiveEmployeeAddedNotifications ? unreadEmployeeNotifications.length : 0);

  const openNotifications = () => {
    setIsOpen(true);

    if (unreadPendingUsers.length) {
      const unreadIds = new Set(unreadPendingUsers.map((account) => String(account.uid)));
      const nextSeenIds = new Set(seenPendingIds);
      unreadIds.forEach((id) => nextSeenIds.add(id));
      saveSeenPendingRegistrationIds(nextSeenIds);
      setSeenPendingIds(nextSeenIds);
      setActiveNotificationIds(unreadIds);
    } else {
      setActiveNotificationIds(new Set());
    }

    if (unreadEmployeeNotifications.length) {
      const unreadIds = new Set(unreadEmployeeNotifications.map((notification) => String(notification.id)));
      setActiveEmployeeNotificationIds(unreadIds);
      setEmployeeNotifications((current) =>
        current.map((notification) =>
          unreadIds.has(String(notification.id)) ? { ...notification, readAt: notification.readAt || new Date().toISOString() } : notification
        )
      );
      notificationService.markAllRead().catch(() => {});
    } else {
      setActiveEmployeeNotificationIds(new Set());
    }
  };

  const clearEmployeeNotifications = async () => {
    if (!employeeNotifications.length || isClearing) return;

    setIsClearing(true);
    const previousNotifications = employeeNotifications;
    setEmployeeNotifications([]);
    setActiveEmployeeNotificationIds(new Set());

    try {
      await notificationService.clearAll();
    } catch (error) {
      setEmployeeNotifications(previousNotifications);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    if (!canManageUsers && !canReceiveEmployeeAddedNotifications) {
      setNotifyRegistrationAttempts(false);
      setUsers([]);
      setEmployeeNotifications([]);
      setActiveNotificationIds(new Set());
      setActiveEmployeeNotificationIds(new Set());
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);

      try {
        const [settingsResult, accountListResult, employeeNotificationResult] = await Promise.allSettled([
          canManageUsers ? settingsService.get() : Promise.resolve(null),
          canManageUsers ? userService.list() : Promise.resolve([]),
          canReceiveEmployeeAddedNotifications ? notificationService.list({ limit: 30 }) : Promise.resolve([]),
        ]);
        if (!isMounted) return;

        if (canManageUsers && settingsResult.status === 'fulfilled' && settingsResult.value) {
          setNotifyRegistrationAttempts(Boolean(settingsResult.value.notifyRegistrationAttempts));
        }

        const nextUsers = canManageUsers && accountListResult.status === 'fulfilled' && Array.isArray(accountListResult.value) ? accountListResult.value : [];
        setUsers(nextUsers);
        window.dispatchEvent(new CustomEvent(USER_ACCOUNTS_REFRESHED_EVENT, { detail: { users: nextUsers } }));

        const nextEmployeeNotifications =
          canReceiveEmployeeAddedNotifications && employeeNotificationResult.status === 'fulfilled' && Array.isArray(employeeNotificationResult.value)
            ? employeeNotificationResult.value
            : [];
        setEmployeeNotifications(nextEmployeeNotifications);
      } catch (error) {
        if (!isMounted) return;

        setUsers([]);
        setEmployeeNotifications([]);
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
  }, [canManageUsers, canReceiveEmployeeAddedNotifications]);

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
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#EF4444] px-1 text-[0.625rem] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-end bg-[#111827]/30 px-4 py-20 sm:px-8"
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
              <div className="flex items-center gap-2">
                {employeeNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearEmployeeNotifications}
                    disabled={isClearing}
                    className="rounded-lg border px-3 py-1.5 text-[0.6875rem] font-black uppercase transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {isClearing ? 'Clearing' : 'Clear all'}
                  </button>
                )}
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
            </div>

            <div className="max-h-[28rem] overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
                </div>
              ) : accountRequestNotifications.length > 0 || employeeNotifications.length > 0 ? (
                <div className="space-y-3">
                  {employeeNotifications.map((notification) => {
                    const timestamp = formatNotificationTimestamp(notification.createdAt);

                    return (
                    <div
                      key={notification.id}
                      className="rounded-xl border p-4 text-left transition-colors"
                      style={
                        activeEmployeeNotificationIds.has(String(notification.id))
                          ? { borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.08)' }
                          : { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="rounded-xl p-2"
                          style={
                            activeEmployeeNotificationIds.has(String(notification.id))
                              ? { color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.1)' }
                              : { backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)' }
                          }
                        >
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{notification.actorName || 'Someone'}</p>
                            {activeEmployeeNotificationIds.has(String(notification.id)) && (
                              <span className="rounded-full px-2 py-0.5 text-[0.625rem] font-black uppercase" style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' }}>
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[0.6875rem] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{notification.actorRole || 'User'}</p>
                          {timestamp && (
                            <p className="mt-1 text-[0.6875rem] font-bold" style={{ color: 'var(--color-text-muted)' }}>{timestamp}</p>
                          )}
                          <p className="mt-2 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                            Added <span style={{ color: 'var(--color-text-primary)' }}>{notification.entityLabel || 'an employee'}</span> to employee records.
                          </p>
                          {notification.actionUrl && (
                            <Link
                              to={notification.actionUrl}
                              onClick={() => setIsOpen(false)}
                              className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white transition-colors hover:bg-[#374151]"
                            >
                              View profile
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
                              <span className="rounded-full px-2 py-0.5 text-[0.625rem] font-black uppercase" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}>
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>{account.fullName || account.email}</p>
                          <p className="mt-0.5 truncate text-[0.6875rem] font-bold" style={{ color: 'var(--color-text-muted)' }}>{account.email}</p>
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
