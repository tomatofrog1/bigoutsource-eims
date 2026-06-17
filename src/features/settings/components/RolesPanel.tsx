import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Check, Loader2, Lock, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { roleService, type CapabilityItem, type Role } from '@/src/features/settings/services/roleService';
import { SkeletonLoadingMessage } from '@/src/common/components/SkeletonLoadingMessage';
import { CapabilityChecklist } from '@/src/features/settings/components/CapabilityChecklist';

type RoleDraft = {
  slug?: string;
  name: string;
  capabilities: string[];
  locked: boolean;
};

export function RolesPanel() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<CapabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const [roleList, caps] = await Promise.all([roleService.list(), roleService.capabilities()]);
      setRoles(Array.isArray(roleList) ? roleList : []);
      setCatalog(Array.isArray(caps) ? caps : []);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load roles');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => setDraft({ name: '', capabilities: [], locked: false });
  const openEdit = (role: Role) =>
    setDraft({ slug: role.slug, name: role.name, capabilities: [...role.capabilities], locked: role.slug === 'super_admin' });

  const toggleCap = (key: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            capabilities: current.capabilities.includes(key)
              ? current.capabilities.filter((cap) => cap !== key)
              : [...current.capabilities, key],
          }
        : current
    );
  };

  const saveDraft = async () => {
    if (!draft || draft.locked) return;
    if (draft.name.trim().length < 2) {
      toast.error('Role name must be at least 2 characters');
      return;
    }

    setIsSaving(true);
    try {
      if (draft.slug) {
        await roleService.update(draft.slug, { name: draft.name.trim(), capabilities: draft.capabilities });
        toast.success('Role updated');
      } else {
        await roleService.create({ name: draft.name.trim(), capabilities: draft.capabilities });
        toast.success('Role created');
      }
      setDraft(null);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Unable to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await roleService.remove(deleteTarget.slug);
      toast.success('Role deleted');
      setDeleteTarget(null);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete role');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <SkeletonLoadingMessage message="Loading roles & permissions..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>
          Define what each role can see and do. Built-in roles can be tuned; Super Admin is locked.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#374151] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const locked = role.slug === 'super_admin';
          return (
            <div
              key={role.slug}
              className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[#F3F4F6] p-2 text-[#111827]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{role.name}</h3>
                    <span className="text-[0.625rem] font-black uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                      {role.isSystem ? 'Built-in' : 'Custom'}
                    </span>
                  </div>
                </div>
                {locked && <Lock className="h-4 w-4" style={{ color: 'var(--color-text-faint)' }} />}
              </div>

              <p className="mb-4 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                {locked ? 'Full access (all capabilities)' : `${role.capabilities.length} capabilit${role.capabilities.length === 1 ? 'y' : 'ies'}`}
              </p>

              <div className="mt-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(role)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-bold text-[#4B5563] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {locked ? 'View' : 'Edit'}
                </button>
                {!role.isSystem && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(role)}
                    aria-label={`Delete ${role.name}`}
                    className="inline-flex items-center justify-center rounded-lg border border-[#FEE2E2] bg-white px-3 py-2 text-[#B91C1C] transition-colors hover:bg-[#FEF2F2]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / edit modal */}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
            onClick={() => setDraft(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {draft.locked ? draft.name : draft.slug ? 'Edit Role' : 'Create Role'}
                  </h2>
                  <p className="mt-1 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {draft.locked ? 'Super Admin always has every capability and cannot be changed.' : 'Pick the capabilities this role grants.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-lg p-2 transition-colors hover:bg-[#F3F4F6]"
                  style={{ color: 'var(--color-text-faint)' }}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Role Name
                </label>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                  disabled={draft.locked || Boolean(draft.slug && draft.locked)}
                  placeholder="e.g. Auditor"
                  className="mb-6 w-full rounded-xl border bg-[#F9FAFB] px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-[#111827] disabled:opacity-60"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />

                <CapabilityChecklist
                  catalog={catalog}
                  selected={draft.locked ? catalog.map((item) => item.key) : draft.capabilities}
                  onToggle={toggleCap}
                  readOnly={draft.locked}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:bg-[#F9FAFB]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {draft.locked ? 'Close' : 'Cancel'}
                </button>
                {!draft.locked && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-[#374151] disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {draft.slug ? 'Save Changes' : 'Create Role'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-md rounded-2xl border bg-white shadow-2xl"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>Delete Role</h2>
                  <p className="mt-1 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    Delete <span className="font-black" style={{ color: 'var(--color-text-primary)' }}>{deleteTarget.name}</span>? This can't be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={busy}
                  className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:bg-[#F9FAFB] disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
