import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import {
  Bell,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  Save,
  Sun,
  Type,
  UserCheck,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/common/components/layout/PageLayout';
import { SkeletonLoadingMessage } from '@/src/common/components/SkeletonLoadingMessage';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useTextSize, type TextSize } from '@/src/contexts/TextSizeContext';
import { AppUser } from '@/src/types';
import { authService } from '@/src/features/auth/services/authService';
import { settingsService } from '@/src/features/settings/services/settingsService';
import { userService } from '@/src/services/userService';

type SettingsTab = 'profile' | 'notifications' | 'password';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export default function Settings() {
  const { can } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { textSize, setTextSize } = useTextSize();
  const isSuperAdmin = can('settings.manage');
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(null);
  const [companyName, setCompanyName] = useState('BigOutsource');
  const [notifyRegistrationAttempts, setNotifyRegistrationAttempts] = useState(true);
  const [notifySystemAlerts, setNotifySystemAlerts] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const changePasswordErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (newPassword) {
      const missingRules = PASSWORD_RULES.filter((rule) => !rule.test(newPassword)).map((rule) => rule.label.toLowerCase());
      if (missingRules.length) {
        errors.newPassword = `Password must include ${missingRules.join(', ')}.`;
      }
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    return errors;
  }, [newPassword, confirmPassword]);

  const newPasswordStrengthScore = PASSWORD_RULES.filter((rule) => rule.test(newPassword)).length;
  const newPasswordStrength = newPasswordStrengthScore <= 2 ? 'Weak' : newPasswordStrengthScore <= 4 ? 'Fair' : 'Strong';
  const newPasswordStrengthColor =
    newPasswordStrengthScore <= 2 ? 'bg-[#EF4444]' : newPasswordStrengthScore <= 4 ? 'bg-[#F59E0B]' : 'bg-[#10B981]';

  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    Object.keys(changePasswordErrors).length === 0;

  async function loadSettings() {
    setIsLoading(true);

    if (!isSuperAdmin) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      const [settings, accountList] = await Promise.all([settingsService.get(), userService.list()]);
      setCompanyName(settings.companyName || 'BigOutsource');
      setNotifyRegistrationAttempts(Boolean(settings.notifyRegistrationAttempts));
      setNotifySystemAlerts(Boolean(settings.notifySystemAlerts));
      setUsers(asArray(accountList));
    } catch (error: any) {
      toast.error(error.message || 'Unable to load settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'password') {
      setActiveTab(null);
    }
  }, [activeTab, isSuperAdmin]);

  const pendingUsers = users.filter((user) => user.status === 'pending');

  const systemAlerts = useMemo(
    () => [
      {
        title: 'Pending account requests',
        detail: `${pendingUsers.length} employee account${pendingUsers.length === 1 ? '' : 's'} waiting for approval.`,
        tone: pendingUsers.length > 0 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50',
      },
      {
        title: 'Disabled accounts',
        detail: `${users.filter((user) => user.status === 'disabled').length} disabled account${users.filter((user) => user.status === 'disabled').length === 1 ? '' : 's'} on record.`,
        tone: 'text-[#4B5563] bg-[#F3F4F6]',
      },
    ],
    [pendingUsers.length, users]
  );

  const saveProfileAndNotifications = async () => {
    setIsSaving(true);
    try {
      await settingsService.update({
        companyName,
        notifyRegistrationAttempts,
        notifySystemAlerts,
      });
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Unable to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canChangePassword) {
      const firstError = Object.values(changePasswordErrors)[0] || 'Please complete all password requirements.';
      toast.error(firstError);
      return;
    }

    setIsSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed');
    } catch (error: any) {
      toast.error(error.message || 'Unable to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const closeSettingsModal = () => {
    if (activeTab === 'password') {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setVisiblePasswords({
        current: false,
        next: false,
        confirm: false,
      });
    }

    setActiveTab(null);
  };

  return (
    <PageLayout title="System Settings">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div key="skeleton-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="w-full flex flex-col gap-3 relative">
              {[...Array(isSuperAdmin ? 4 : 2)].map((_, i) => (
                <div key={i} className="h-14 w-full rounded-2xl bg-white border border-[#E5E7EB] shadow-sm animate-pulse flex items-center px-4">
                  <div className="h-6 w-6 rounded-md bg-gray-200"></div>
                  <div className="ml-3 h-4 w-24 bg-gray-200 rounded"></div>
                </div>
              ))}
              <SkeletonLoadingMessage message="Loading configuration..." />
            </motion.div>
          ) : (
            <motion.aside key="content-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="w-full">
              <div className="flex flex-col gap-3">
                {isSuperAdmin && (
                  <>
                    <TabButton active={activeTab === 'profile'} icon={Building2} label="Profile" onClick={() => setActiveTab('profile')} />
                    <TabButton active={activeTab === 'notifications'} icon={Bell} label="Notification" onClick={() => setActiveTab('notifications')} />
                  </>
                )}
                <TabButton active={activeTab === 'password'} icon={Lock} label="Password" onClick={() => setActiveTab('password')} />
                <div
                  className="flex min-h-24 w-full items-center justify-between rounded-2xl border px-5"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span className="flex items-center gap-3 text-sm font-black">
                    {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    Dark Mode
                  </span>
                  <DarkModeToggle isDark={isDark} onToggle={toggleTheme} />
                </div>
                <div
                  className="flex min-h-24 w-full items-center justify-between rounded-2xl border px-5"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span className="flex items-center gap-3 text-sm font-black">
                    <Type className="h-5 w-5" />
                    <span className="flex flex-col">
                      Text Size
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Adjust the size of everything for easier reading
                      </span>
                    </span>
                  </span>
                  <TextSizeSelector value={textSize} onChange={setTextSize} />
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isLoading && activeTab ? (
            <SettingsModal onClose={closeSettingsModal}>
            {isSuperAdmin && activeTab === 'profile' && (
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-[#F3F4F6] p-3 text-[#111827]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#111827]">Profile Information</h2>
                    <p className="text-sm font-medium text-[#6B7280]">This name appears wherever the system identifies your company.</p>
                  </div>
                </div>

                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#374151]">Company Name</label>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="w-full max-w-xl rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#111827]"
                  placeholder="BigOutsource"
                />

                <SaveButton onClick={saveProfileAndNotifications} isSaving={isSaving} />
              </section>
            )}

            {isSuperAdmin && activeTab === 'notifications' && (
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-[#F3F4F6] p-3 text-[#111827]">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#111827]">Notifications</h2>
                    <p className="text-sm font-medium text-[#6B7280]">Control the alerts shown to the Super Admin.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <ToggleRow
                    label="Registration attempts"
                    detail="Notify the Super Admin when someone submits an account request."
                    checked={notifyRegistrationAttempts}
                    onChange={setNotifyRegistrationAttempts}
                  />
                  <ToggleRow
                    label="System alerts"
                    detail="Show account and system status alerts in this settings area."
                    checked={notifySystemAlerts}
                    onChange={setNotifySystemAlerts}
                  />
                </div>

                {notifySystemAlerts && (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {systemAlerts.map((alert) => (
                      <div key={alert.title} className="rounded-xl border border-[#E5E7EB] p-4">
                        <span className={`mb-3 inline-flex rounded-lg px-2 py-1 text-[0.625rem] font-black uppercase ${alert.tone}`}>Alert</span>
                        <h3 className="text-sm font-black text-[#111827]">{alert.title}</h3>
                        <p className="mt-1 text-xs font-bold text-[#6B7280]">{alert.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                <SaveButton onClick={saveProfileAndNotifications} isSaving={isSaving} />
              </section>
            )}

            {activeTab === 'password' && (
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-[#F3F4F6] p-3 text-[#111827]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#111827]">Password</h2>
                    <p className="text-sm font-medium text-[#6B7280]">Change your account password.</p>
                  </div>
                </div>

                <form onSubmit={changePassword} className="grid max-w-xl gap-4">
                  <PasswordInput
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    isVisible={visiblePasswords.current}
                    onToggleVisibility={() => setVisiblePasswords((state) => ({ ...state, current: !state.current }))}
                    placeholder="Enter current password"
                  />
                  <PasswordInput
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    isVisible={visiblePasswords.next}
                    onToggleVisibility={() => setVisiblePasswords((state) => ({ ...state, next: !state.next }))}
                    placeholder="Enter new password"
                    error={changePasswordErrors.newPassword}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5" aria-label={`Password strength: ${newPasswordStrength}`}>
                      {PASSWORD_RULES.map((rule) => (
                        <div
                          key={rule.label}
                          className={`h-1.5 flex-1 rounded-full ${rule.test(newPassword) ? newPasswordStrengthColor : 'bg-[#E5E7EB]'}`}
                        />
                      ))}
                      <span className="ml-2 text-[0.625rem] font-black uppercase tracking-wider text-[#6B7280]">
                        {newPasswordStrength}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-[0.6875rem] text-[#6B7280]">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(newPassword);
                        return (
                          <p key={rule.label} className={passed ? 'text-[#047857]' : 'text-[#6B7280]'}>
                            {passed ? 'OK' : '-'} {rule.label}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                  <PasswordInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    isVisible={visiblePasswords.confirm}
                    onToggleVisibility={() => setVisiblePasswords((state) => ({ ...state, confirm: !state.confirm }))}
                    placeholder="Confirm new password"
                    error={changePasswordErrors.confirmPassword}
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !canChangePassword}
                    className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#374151] disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    Change Password
                  </button>
                </form>
              </section>
            )}

            </SettingsModal>
          ) : null}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

function SettingsModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            aria-label="Close settings popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 w-full items-center justify-between rounded-2xl border px-5 text-left"
      style={active ? {
        borderColor: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-text-primary)',
        color: 'white',
      } : {
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
      }}
    >
      <span className="flex items-center gap-3 text-sm font-black">
        <Icon className="h-5 w-5" />
        {label}
      </span>
      {Boolean(badge) && <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.625rem] font-black text-amber-800">{badge}</span>}
    </button>
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] p-4">
      <span>
        <span className="block text-sm font-black text-[#111827]">{label}</span>
        <span className="mt-1 block text-xs font-bold text-[#6B7280]">{detail}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#111827]" />
    </label>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  isVisible,
  onToggleVisibility,
  placeholder = 'Enter password',
  minLength = 1,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
  minLength?: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type={isVisible ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#111827] transition-colors"
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

function SaveButton({ onClick, isSaving }: { onClick: () => void; isSaving: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#374151] disabled:opacity-50"
    >
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save Changes
    </button>
  );
}

function DarkModeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: isDark ? '#6366F1' : '#D1D5DB',
      }}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md"
        style={{ marginLeft: isDark ? '2.125rem' : '0.25rem' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-3.5 w-3.5 text-[#6366F1]" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-3.5 w-3.5 text-[#F59E0B]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}

const TEXT_SIZE_OPTIONS: { level: TextSize; label: string; sample: string }[] = [
  { level: 'small', label: 'Small', sample: '0.7rem' },
  { level: 'medium', label: 'Medium', sample: '0.85rem' },
  { level: 'large', label: 'Large', sample: '1rem' },
];

function TextSizeSelector({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  return (
    <div
      className="inline-flex shrink-0 items-stretch gap-1 rounded-full p-1"
      style={{ backgroundColor: 'var(--color-surface-secondary)' }}
      role="radiogroup"
      aria-label="Text size"
    >
      {TEXT_SIZE_OPTIONS.map((opt) => {
        const active = value === opt.level;
        return (
          <button
            key={opt.level}
            type="button"
            onClick={() => onChange(opt.level)}
            className="relative rounded-full px-3.5 py-1.5"
            role="radio"
            aria-checked={active}
            aria-label={`${opt.label} text size`}
          >
            {active && (
              <motion.span
                layoutId="textSizePill"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: '#6366F1' }}
              />
            )}
            <span
              className="relative flex items-baseline gap-1.5 font-black leading-none"
              style={{ color: active ? '#FFFFFF' : 'var(--color-text-muted)' }}
            >
              <span style={{ fontSize: opt.sample }}>A</span>
              <span className="text-xs">{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
