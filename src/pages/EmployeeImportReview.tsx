import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Edit, Loader2, Merge, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { cn } from '@/src/lib/utils';
import { employeeImportService } from '@/src/services/employeeImportService';
import { accountService } from '@/src/services/accountService';

type ImportRow = {
  id: string;
  importBatchId: string;
  sourceRow: number;
  normalizedData: Record<string, any>;
  issues: Array<{ code: string; message: string }>;
  status: 'ready' | 'issue' | 'imported' | 'skipped';
  duplicateKey?: string;
};

type DuplicateGroupInfo = {
  key: string;
  importBatchId: string;
  duplicateKey: string;
  rows: ImportRow[];
};

type AccountOption = {
  id: string;
  name: string;
};

type DeleteIntent = {
  title: string;
  detail: string;
  phrase: string;
  ids: string[];
};

const siteOptions = ['San Pablo City (HQ)', 'Candelaria', 'WFH', 'Hybrid'];

const importReviewCache: {
  rows: ImportRow[];
  focusedBatchId: string;
  activeView: 'ready' | 'issues' | 'duplicates';
  hasLoaded: boolean;
} = {
  rows: [],
  focusedBatchId: '',
  activeView: 'issues',
  hasLoaded: false,
};

const fieldLabels: Array<[string, string]> = [
  ['employeeNumber', 'ID'],
  ['fullName', 'Name'],
  ['accountAssignment', 'Account'],
  ['phone', 'Phone'],
  ['address', 'Address'],
  ['boEmail', 'Email'],
  ['emailPassword', 'Email Password'],
  ['lmsAccount', 'LMS Account'],
  ['status', 'Status'],
  ['siteName', 'Site'],
  ['pcName', 'PC Name'],
  ['rustdeskId', 'RustDesk ID'],
  ['remoteId', 'Remote ID'],
  ['esetStatus', 'ESET'],
  ['biosDate', 'BIOS Date'],
  ['activityWatchStatus', 'ActivityWatch'],
  ['windowsKey', 'Windows Key'],
  ['is_archived', 'Archived'],
];

function completenessForData(data: Record<string, any> = {}) {
  return fieldLabels.reduce((count, [key]) => {
    const value = data?.[key];
    if (typeof value === 'boolean') return count + 1;
    return value ? count + 1 : count;
  }, 0);
}

function completeness(row: ImportRow) {
  return completenessForData(row.normalizedData);
}

function issueText(row: ImportRow) {
  return row.issues?.map((issue) => issue.message).join(', ') || 'Needs review';
}

function normalizeSiteOption(value?: string) {
  const next = String(value || '').trim().toLowerCase();
  if (next === 'can' || next === 'cand' || next === 'candelaria') return 'Candelaria';
  if (next === 'wfh/hybrid' || next === 'hybrid') return 'Hybrid';
  if (next === 'wfh') return 'WFH';
  if (next === 'hq') return 'San Pablo City (HQ)';
  if (next === 'san pablo') return 'San Pablo City (HQ)';
  if (next === 'san pablo city') return 'San Pablo City (HQ)';
  if (next === 'san pablo city (hq)') return 'San Pablo City (HQ)';
  return value || '';
}

function normalizeFormOptions(data: Record<string, any>) {
  return {
    ...data,
    siteName: normalizeSiteOption(data.siteName),
  };
}

function mergeDefaults(rows: ImportRow[]) {
  const sorted = [...rows].sort((a, b) => completeness(b) - completeness(a));
  const merged = { ...sorted[0]?.normalizedData };

  sorted.slice(1).forEach((row) => {
    fieldLabels.forEach(([key]) => {
      if ((merged[key] === undefined || merged[key] === null || merged[key] === '') && row.normalizedData?.[key]) {
        merged[key] = row.normalizedData[key];
      }
    });
  });

  return normalizeFormOptions(merged);
}

export default function EmployeeImportReview() {
  const { batchId } = useParams();
  const [rows, setRows] = useState<ImportRow[]>(() => importReviewCache.rows);
  const [isLoading, setIsLoading] = useState(() => !importReviewCache.hasLoaded);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingRow, setIsSavingRow] = useState(false);
  const [isSavingMerge, setIsSavingMerge] = useState(false);
  const [isDeletingRows, setIsDeletingRows] = useState(false);
  const [editingRow, setEditingRow] = useState<ImportRow | null>(null);
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroupInfo | null>(null);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [mergeForm, setMergeForm] = useState<Record<string, any>>({});
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [focusedBatchId, setFocusedBatchId] = useState(() => importReviewCache.focusedBatchId);
  const [activeView, setActiveView] = useState<'ready' | 'issues' | 'duplicates'>(() => importReviewCache.activeView);

  async function loadRows() {
    if (!importReviewCache.hasLoaded) setIsLoading(true);
    try {
      const targetBatchId = batchId || focusedBatchId;
      let result = await employeeImportService.list(targetBatchId ? { importBatchId: targetBatchId } : { status: 'issue' });

      if (!targetBatchId) {
        const issueRows = Array.isArray(result.rows) ? result.rows : [];
        const issueBatchId = issueRows[0]?.importBatchId;

        if (issueBatchId) {
          result = await employeeImportService.list({ importBatchId: issueBatchId });
          importReviewCache.focusedBatchId = issueBatchId;
          setFocusedBatchId(issueBatchId);
        }
      }

      const nextRows = Array.isArray(result.rows) ? result.rows : [];
      importReviewCache.rows = nextRows;
      importReviewCache.focusedBatchId = targetBatchId || importReviewCache.focusedBatchId;
      importReviewCache.hasLoaded = true;
      setRows(nextRows);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load import review');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [batchId, focusedBatchId]);

  useEffect(() => {
    importReviewCache.activeView = activeView;
  }, [activeView]);

  useEffect(() => {
    let isMounted = true;

    accountService.list()
      .then((value) => {
        const accountOptions = Array.isArray(value)
          ? value.filter((account: any) => account?.id && account?.name).map((account: any) => ({ id: account.id, name: account.name }))
          : [];

        if (isMounted) setAccounts(accountOptions);
      })
      .catch(() => {
        if (isMounted) setAccounts([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const readyRows = rows.filter((row) => row.status === 'ready');
  const issueRows = rows.filter((row) => row.status === 'issue');
  const importedRows = rows.filter((row) => row.status === 'imported');
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, ImportRow[]>();
    rows
      .filter((row) => row.status === 'issue' && row.duplicateKey)
      .forEach((row) => {
        const key = `${row.importBatchId}:${row.duplicateKey}`;
        groups.set(key, [...(groups.get(key) || []), row]);
      });

    return [...groups.entries()].map(([key, items]): DuplicateGroupInfo => ({
      key,
      importBatchId: items[0].importBatchId,
      duplicateKey: items[0].duplicateKey!,
      rows: items,
    }));
  }, [rows]);

  const visibleIssueRows = issueRows.filter((row) => !row.duplicateKey);
  const duplicateRows = duplicateGroups.flatMap((group) => group.rows);

  const requestDeleteRows = (intent: DeleteIntent) => {
    if (!intent.ids.length) return;
    setDeleteIntent(intent);
  };

  const deleteRows = async () => {
    if (!deleteIntent) return;

    setIsDeletingRows(true);
    try {
      const result = await employeeImportService.deleteRows(deleteIntent.ids);
      toast.success(`${result.deleted || 0} staging record${result.deleted === 1 ? '' : 's'} deleted`);
      setDeleteIntent(null);
      await loadRows();
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete staging records');
    } finally {
      setIsDeletingRows(false);
    }
  };

  const importReady = async () => {
    const targetBatchId = batchId || rows[0]?.importBatchId;
    if (!targetBatchId) return;

    setIsImporting(true);
    try {
      const result = await employeeImportService.importReady(targetBatchId);
      toast.success(`${result.imported || 0} employee record${result.imported === 1 ? '' : 's'} imported`);
      await loadRows();
    } catch (error: any) {
      toast.error(error.message || 'Unable to import ready records');
    } finally {
      setIsImporting(false);
    }
  };

  const resolveDuplicate = async (
    importBatchId: string,
    duplicateKey: string,
    action: 'keep' | 'merge',
    keepRowId?: string,
    normalizedData?: Record<string, any>
  ) => {
    try {
      const result = await employeeImportService.resolveDuplicate({ importBatchId, duplicateKey, action, keepRowId, normalizedData });
      const refreshed = await employeeImportService.list({ importBatchId });
      const keptRow = Array.isArray(result.rows)
        ? result.rows.find((row: ImportRow) => row.status === 'ready' || row.status === 'issue')
        : null;

      const nextRows = Array.isArray(refreshed.rows) ? refreshed.rows : [];
      importReviewCache.focusedBatchId = importBatchId;
      importReviewCache.rows = nextRows;
      importReviewCache.hasLoaded = true;
      setFocusedBatchId(importBatchId);
      setRows(nextRows);

      if (keptRow?.status === 'ready') {
        toast.success(`${action === 'merge' ? 'Merged row' : 'Selected row'} moved to Ready. Click Import Ready Records to add it to Employee Records.`);
      } else {
        const reason = keptRow?.issues?.map((issue: any) => issue.message).join(', ') || 'remaining issues';
        toast.success(`${action === 'merge' ? 'Merged row' : 'Selected row'} still needs review: ${reason}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Unable to resolve duplicate');
      throw error;
    }
  };

  const openEditor = (row: ImportRow) => {
    setEditingRow(row);
    setEditForm(normalizeFormOptions({ ...row.normalizedData }));
  };

  const updateEditForm = (field: string, value: string | boolean) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const openMergeModal = (group: DuplicateGroupInfo) => {
    setMergeGroup(group);
    setMergeForm(mergeDefaults(group.rows));
  };

  const updateMergeForm = (field: string, value: string | boolean) => {
    setMergeForm((current) => ({ ...current, [field]: value }));
  };

  const saveMergedRow = async () => {
    if (!mergeGroup) return;

    setIsSavingMerge(true);
    try {
      await resolveDuplicate(mergeGroup.importBatchId, mergeGroup.duplicateKey, 'merge', undefined, mergeForm);
      setMergeGroup(null);
      setMergeForm({});
    } finally {
      setIsSavingMerge(false);
    }
  };

  const saveEditedRow = async () => {
    if (!editingRow) return;

    setIsSavingRow(true);
    try {
      const updated = await employeeImportService.updateRow(editingRow.id, editForm);
      setFocusedBatchId(updated.importBatchId);
      const refreshed = await employeeImportService.list({ importBatchId: updated.importBatchId });
      const nextRows = Array.isArray(refreshed.rows) ? refreshed.rows : [];
      importReviewCache.focusedBatchId = updated.importBatchId;
      importReviewCache.rows = nextRows;
      importReviewCache.hasLoaded = true;
      setRows(nextRows);
      setEditingRow(null);
      setEditForm({});
      toast.success(updated.status === 'ready' ? 'Row fixed and moved to Ready' : 'Row saved, but still needs review');
    } catch (error: any) {
      toast.error(error.message || 'Unable to save import row');
    } finally {
      setIsSavingRow(false);
    }
  };

  return (
    <PageLayout title="Import Review" contentClassName="w-full max-w-none">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Metric label="Ready" value={readyRows.length} tone="green" />
          <Metric label="Issues" value={issueRows.length} tone="red" />
          <Metric label="Duplicates" value={duplicateGroups.length} tone="amber" />
          <Metric label="Imported" value={importedRows.length} tone="gray" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <Tab active={activeView === 'issues'} onClick={() => setActiveView('issues')}>Issues</Tab>
            <Tab active={activeView === 'duplicates'} onClick={() => setActiveView('duplicates')}>Duplicates</Tab>
            <Tab active={activeView === 'ready'} onClick={() => setActiveView('ready')}>Ready</Tab>
          </div>
          <p className="max-w-xl text-xs font-bold leading-relaxed text-[#6B7280]">
            Keep and Merge only resolve staged rows. Nothing goes into Employee Records until you click Import Ready Records.
          </p>
          <div className="flex flex-wrap gap-2">
            {activeView === 'issues' && (
              <BulkDeleteButton
                disabled={!visibleIssueRows.length}
                onClick={() => requestDeleteRows({
                  title: 'Delete All Issue Records',
                  detail: `This will permanently delete ${visibleIssueRows.length} non-duplicate issue staging record${visibleIssueRows.length === 1 ? '' : 's'} from the database.`,
                  phrase: 'DELETE ISSUE RECORDS',
                  ids: visibleIssueRows.map((row) => row.id),
                })}
              >
                Delete All Issues
              </BulkDeleteButton>
            )}
            {activeView === 'duplicates' && (
              <BulkDeleteButton
                disabled={!duplicateRows.length}
                onClick={() => requestDeleteRows({
                  title: 'Delete All Duplicate Records',
                  detail: `This will permanently delete ${duplicateRows.length} duplicate staging record${duplicateRows.length === 1 ? '' : 's'} from the database.`,
                  phrase: 'DELETE DUPLICATE RECORDS',
                  ids: duplicateRows.map((row) => row.id),
                })}
              >
                Delete All Duplicates
              </BulkDeleteButton>
            )}
            {activeView === 'ready' && (
              <BulkDeleteButton
                disabled={!readyRows.length}
                onClick={() => requestDeleteRows({
                  title: 'Delete All Ready Records',
                  detail: `This will permanently delete ${readyRows.length} ready-to-import staging record${readyRows.length === 1 ? '' : 's'} from the database.`,
                  phrase: 'DELETE READY RECORDS',
                  ids: readyRows.map((row) => row.id),
                })}
              >
                Delete All Ready
              </BulkDeleteButton>
            )}
            <button
              type="button"
              onClick={importReady}
              disabled={!readyRows.length || isImporting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Import Ready Records
            </button>
          </div>
        </div>

        <>
          {isLoading ? (
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm w-full">
              <table className="w-full min-w-[920px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Status</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Row</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Employee</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Issues</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-lg"></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-gray-200 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 bg-gray-200 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-9 w-20 bg-gray-200 rounded-lg ml-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col gap-0 w-full">
              {activeView === 'duplicates' && (
                <div className="space-y-5">
                  {duplicateGroups.length ? (
                    duplicateGroups.map((group) => (
                      <DuplicateGroup
                        key={group.key}
                        importBatchId={group.importBatchId}
                        groupKey={group.duplicateKey}
                        rows={group.rows}
                        onResolve={resolveDuplicate}
                        onMerge={() => openMergeModal(group)}
                        onDelete={(ids, label) => requestDeleteRows({
                          title: 'Delete Duplicate Records',
                          detail: `This will permanently delete ${ids.length} duplicate staging record${ids.length === 1 ? '' : 's'} for ${label} from the database.`,
                          phrase: 'DELETE DUPLICATES',
                          ids,
                        })}
                      />
                    ))
                  ) : (
                    <EmptyState title="No duplicate issues" detail="Duplicate employee IDs will appear here after staging." />
                  )}
                </div>
              )}
    
              {activeView === 'issues' && (
                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm mt-0">
                  {visibleIssueRows.length ? (
                    <IssueTable
                      rows={visibleIssueRows}
                      onEdit={openEditor}
                      onDelete={(row) => requestDeleteRows({
                        title: 'Delete Import Staging Record',
                        detail: `This will permanently delete staging row ${row.sourceRow} from the database.`,
                        phrase: 'DELETE IMPORT ROW',
                        ids: [row.id],
                      })}
                    />
                  ) : (
                    <EmptyState title="No non-duplicate issues" detail="Blank IDs, missing required fields, and database errors appear here." />
                  )}
                </div>
              )}
    
              {activeView === 'ready' && (
                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm mt-0">
                  {readyRows.length ? (
                    <IssueTable
                      rows={readyRows}
                      ready
                      onEdit={openEditor}
                      onDelete={(row) => requestDeleteRows({
                        title: 'Delete Ready Import Record',
                        detail: `This will permanently delete ready staging row ${row.sourceRow} from the database.`,
                        phrase: 'DELETE IMPORT ROW',
                        ids: [row.id],
                      })}
                    />
                  ) : (
                    <EmptyState title="No ready rows" detail="Resolve issues to move rows into the ready list." />
                  )}
                </div>
              )}
            </div>
          )}
        </>
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white py-12 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6]">
              <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">
              Loading import data...
            </h3>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingRow && (
          <EditRowModal
            row={editingRow}
            form={editForm}
            accounts={accounts}
            isSaving={isSavingRow}
            onChange={updateEditForm}
            onClose={() => {
              if (isSavingRow) return;
              setEditingRow(null);
              setEditForm({});
            }}
            onSave={saveEditedRow}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mergeGroup && (
          <MergeRowsModal
            group={mergeGroup}
            form={mergeForm}
            accounts={accounts}
            isSaving={isSavingMerge}
            onChange={updateMergeForm}
            onClose={() => {
              if (isSavingMerge) return;
              setMergeGroup(null);
              setMergeForm({});
            }}
            onSave={saveMergedRow}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteIntent && (
          <ConfirmDeleteModal
            intent={deleteIntent}
            isDeleting={isDeletingRows}
            onClose={() => {
              if (!isDeletingRows) setDeleteIntent(null);
            }}
            onConfirm={deleteRows}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

function BulkDeleteButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:text-[#D1D5DB]"
    >
      <Trash2 className="h-4 w-4" />
      {children}
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'amber' | 'gray' }) {
  const tones = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-[#F3F4F6] text-[#374151]',
  };

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">{label}</p>
      <p className={cn('mt-3 w-fit rounded-xl px-3 py-1 text-2xl font-black', tones[tone])}>{value}</p>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-2 text-sm font-black transition-all',
        active ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#111827]'
      )}
    >
      {children}
    </button>
  );
}

function DuplicateGroup({
  groupKey,
  importBatchId,
  rows,
  onResolve,
  onMerge,
  onDelete,
}: {
  importBatchId: string;
  groupKey: string;
  rows: ImportRow[];
  onResolve: (importBatchId: string, duplicateKey: string, action: 'keep' | 'merge', keepRowId?: string) => void;
  onMerge: () => void;
  onDelete: (ids: string[], label: string) => void;
}) {
  const maxCompleteness = Math.max(...rows.map(completeness));
  const moreCompleteRows = rows.filter((row) => completeness(row) === maxCompleteness);

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#111827]">Duplicate ID: {groupKey}</p>
          <p className="mt-1 text-xs font-bold text-[#6B7280]">Compare rows side by side, keep one, or merge non-empty fields.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDelete(rows.map((row) => row.id), groupKey)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition-all hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Group
          </button>
          <button
            type="button"
            onClick={onMerge}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-black text-[#4B5563] transition-all hover:text-[#111827]"
          >
            <Merge className="h-4 w-4" />
            Merge
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows.map((row) => {
          const score = completeness(row);
          const isMoreComplete = moreCompleteRows.length === 1 && score === maxCompleteness;

          return (
            <div key={row.id} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Spreadsheet row {row.sourceRow}</p>
                  <p className="mt-1 text-sm font-black text-[#111827]">{score}/{fieldLabels.length} fields filled</p>
                </div>
                {isMoreComplete && (
                  <span className="rounded-lg bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700">
                    More complete
                  </span>
                )}
              </div>
              <FieldGrid row={row} />
              <button
                type="button"
                onClick={() => onResolve(importBatchId, groupKey, 'keep', row.id)}
                className="mt-4 w-full rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-[#374151]"
              >
                Keep This One
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MergeRowsModal({
  group,
  form,
  accounts,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  group: DuplicateGroupInfo;
  form: Record<string, any>;
  accounts: AccountOption[];
  isSaving: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const leftRow = group.rows[0];
  const rightRow = group.rows[1] || group.rows[0];
  const mergedCompleteness = completenessForData(form);

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
        className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Merge Duplicate ID {group.duplicateKey}</h2>
            <p className="mt-1 text-xs font-bold text-[#6B7280]">
              Compare the duplicate rows and manually choose the final values in the middle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto p-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,1.15fr)_minmax(0,1fr)]">
          <ComparePanel title={`Row ${leftRow.sourceRow}`} row={leftRow} />
          <div className="rounded-2xl border border-[#111827] bg-white p-4 shadow-lg shadow-[#11182714]">
            <div className="mb-4">
              <p className="text-sm font-black text-[#111827]">Final Merged Record</p>
              <p className="mt-1 text-xs font-bold text-[#6B7280]">Edit these values before saving the merge.</p>
              <p className="mt-1 text-xs font-black text-[#6B7280]">
                Merged result: {mergedCompleteness}/{fieldLabels.length} fields filled
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <EditorInput label="ID" value={form.employeeNumber || ''} onChange={(value) => onChange('employeeNumber', value)} required />
              <EditorInput label="Name" value={form.fullName || ''} onChange={(value) => onChange('fullName', value)} required />
              <EditorSelect label="Account" value={form.accountAssignment || ''} onChange={(value) => onChange('accountAssignment', value)} required>
                <AccountOptions value={form.accountAssignment || ''} accounts={accounts} />
              </EditorSelect>
              <EditorInput label="Bigoutsource Email" value={form.boEmail || ''} onChange={(value) => onChange('boEmail', value)} required />
              <EditorSelect label="Site" value={form.siteName || ''} onChange={(value) => onChange('siteName', value)} required>
                <option value="">Select site</option>
                {siteOptions.map((site) => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </EditorSelect>
              <EditorSelect label="Status" value={form.status || 'active'} onChange={(value) => onChange('status', value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </EditorSelect>
              <EditorInput label="Phone" value={form.phone || ''} onChange={(value) => onChange('phone', value)} />
              <EditorInput label="Address" value={form.address || ''} onChange={(value) => onChange('address', value)} />
              <EditorInput label="Email Password" value={form.emailPassword || ''} onChange={(value) => onChange('emailPassword', value)} />
              <EditorInput label="LMS Account" value={form.lmsAccount || ''} onChange={(value) => onChange('lmsAccount', value)} />
              <EditorInput label="PC Name" value={form.pcName || ''} onChange={(value) => onChange('pcName', value)} />
              <EditorInput label="RustDesk ID" value={form.rustdeskId || ''} onChange={(value) => onChange('rustdeskId', value)} />
              <EditorInput label="Remote ID" value={form.remoteId || ''} onChange={(value) => onChange('remoteId', value)} />
              <EditorSelect label="ESET" value={form.esetStatus || 'inactive'} onChange={(value) => onChange('esetStatus', value)}>
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </EditorSelect>
              <EditorInput label="BIOS Date" type="date" value={form.biosDate || ''} onChange={(value) => onChange('biosDate', value)} />
              <EditorSelect label="ActivityWatch" value={form.activityWatchStatus || 'missing'} onChange={(value) => onChange('activityWatchStatus', value)}>
                <option value="missing">Missing</option>
                <option value="installed">Installed</option>
              </EditorSelect>
              <EditorInput label="Windows Key" value={form.windowsKey || ''} onChange={(value) => onChange('windowsKey', value)} />
              <label className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_archived)}
                  onChange={(event) => onChange('is_archived', event.target.checked)}
                  className="h-4 w-4 accent-[#111827]"
                />
                <span className="text-xs font-black uppercase tracking-widest text-[#4B5563]">Archived</span>
              </label>
            </div>
          </div>
          <ComparePanel title={`Row ${rightRow.sourceRow}`} row={rightRow} />
        </div>

        {group.rows.length > 2 && (
          <p className="border-t border-[#E5E7EB] px-6 py-3 text-xs font-bold text-[#6B7280]">
            This duplicate group has {group.rows.length} rows. The center form was prefilled from all rows, while the side-by-side view shows the first two.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-black text-white transition-all hover:bg-[#374151] disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Merged Record
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ComparePanel({ title, row }: { title: string; row: ImportRow }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#111827]">{title}</p>
          <p className="mt-1 text-xs font-bold text-[#6B7280]">{completeness(row)}/{fieldLabels.length} fields filled</p>
        </div>
      </div>
      <FieldGrid row={row} />
    </div>
  );
}

function FieldGrid({ row }: { row: ImportRow }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {fieldLabels.map(([key, label]) => (
        <div key={key} className="min-w-0 rounded-lg bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase text-[#9CA3AF]">{label}</p>
          <p className="truncate text-xs font-bold text-[#111827]">{String(row.normalizedData?.[key] ?? '') || '-'}</p>
        </div>
      ))}
    </div>
  );
}

function IssueTable({
  rows,
  ready = false,
  onEdit,
  onDelete,
}: {
  rows: ImportRow[];
  ready?: boolean;
  onEdit: (row: ImportRow) => void;
  onDelete: (row: ImportRow) => void;
}) {
  return (
    <table className="w-full min-w-[900px] text-left">
      <thead className="bg-[#F9FAFB]">
        <tr>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Row</th>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">ID</th>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Name</th>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Email</th>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Status</th>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">{ready ? 'Completeness' : 'Issue'}</th>
          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F3F4F6]">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3 text-sm font-bold text-[#111827]">{row.sourceRow}</td>
            <td className="px-4 py-3 text-sm font-bold text-[#111827]">{row.normalizedData.employeeNumber || '-'}</td>
            <td className="px-4 py-3 text-sm font-bold text-[#111827]">{row.normalizedData.fullName || '-'}</td>
            <td className="px-4 py-3 text-sm font-bold text-[#111827]">{row.normalizedData.boEmail || '-'}</td>
            <td className="px-4 py-3 text-sm font-bold text-[#111827]">
              {row.normalizedData.status || '-'}{row.normalizedData.is_archived ? ' / archived' : ''}
            </td>
            <td className="px-4 py-3 text-sm font-bold text-[#4B5563]">
              {ready ? `${completeness(row)}/${fieldLabels.length}` : issueText(row)}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-black text-[#4B5563] transition-all hover:text-[#111827]"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 transition-all hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConfirmDeleteModal({
  intent,
  isDeleting,
  onClose,
  onConfirm,
}: {
  intent: DeleteIntent;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const requiresPhrase = intent.ids.length > 1;
  const canConfirm = !requiresPhrase || typedPhrase === intent.phrase;

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
        className="w-full max-w-lg rounded-2xl border border-[#FECACA] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#FEE2E2] px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-[#111827]">{intent.title}</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-[#6B7280]">{intent.detail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {requiresPhrase ? (
            <>
              <p className="text-xs font-bold text-[#4B5563]">
                Type <span className="font-black text-red-600">{intent.phrase}</span> to confirm.
              </p>
              <input
                value={typedPhrase}
                onChange={(event) => setTypedPhrase(event.target.value)}
                disabled={isDeleting}
                autoFocus
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-red-500"
              />
            </>
          ) : (
            <p className="text-xs font-bold text-[#4B5563]">This action cannot be undone.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#FEE2E2] bg-[#FFF7F7] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Records
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditRowModal({
  row,
  form,
  accounts,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  row: ImportRow;
  form: Record<string, any>;
  accounts: AccountOption[];
  isSaving: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onClose: () => void;
  onSave: () => void;
}) {
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
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Edit Import Row {row.sourceRow}</h2>
            <p className="mt-1 text-xs font-bold text-[#6B7280]">{issueText(row)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl p-2 text-[#9CA3AF] transition-all hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-3">
          <EditorInput label="ID" value={form.employeeNumber || ''} onChange={(value) => onChange('employeeNumber', value)} required />
          <EditorInput label="Name" value={form.fullName || ''} onChange={(value) => onChange('fullName', value)} required />
          <EditorSelect label="Account" value={form.accountAssignment || ''} onChange={(value) => onChange('accountAssignment', value)} required>
            <AccountOptions value={form.accountAssignment || ''} accounts={accounts} />
          </EditorSelect>
          <EditorInput label="Bigoutsource Email" value={form.boEmail || ''} onChange={(value) => onChange('boEmail', value)} required />
          <EditorSelect label="Site" value={form.siteName || ''} onChange={(value) => onChange('siteName', value)} required>
            <option value="">Select site</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>{site}</option>
            ))}
          </EditorSelect>
          <EditorSelect label="Status" value={form.status || 'active'} onChange={(value) => onChange('status', value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </EditorSelect>
          <EditorInput label="Phone" value={form.phone || ''} onChange={(value) => onChange('phone', value)} />
          <EditorInput label="Address" value={form.address || ''} onChange={(value) => onChange('address', value)} />
          <EditorInput label="Email Password" value={form.emailPassword || ''} onChange={(value) => onChange('emailPassword', value)} />
          <EditorInput label="LMS Account" value={form.lmsAccount || ''} onChange={(value) => onChange('lmsAccount', value)} />
          <EditorInput label="PC Name" value={form.pcName || ''} onChange={(value) => onChange('pcName', value)} />
          <EditorInput label="RustDesk ID" value={form.rustdeskId || ''} onChange={(value) => onChange('rustdeskId', value)} />
          <EditorInput label="Remote ID" value={form.remoteId || ''} onChange={(value) => onChange('remoteId', value)} />
          <EditorSelect label="ESET" value={form.esetStatus || 'inactive'} onChange={(value) => onChange('esetStatus', value)}>
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
          </EditorSelect>
          <EditorInput label="BIOS Date" type="date" value={form.biosDate || ''} onChange={(value) => onChange('biosDate', value)} />
          <EditorSelect label="ActivityWatch" value={form.activityWatchStatus || 'missing'} onChange={(value) => onChange('activityWatchStatus', value)}>
            <option value="missing">Missing</option>
            <option value="installed">Installed</option>
          </EditorSelect>
          <EditorInput label="Windows Key" value={form.windowsKey || ''} onChange={(value) => onChange('windowsKey', value)} />
          <label className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.is_archived)}
              onChange={(event) => onChange('is_archived', event.target.checked)}
              className="h-4 w-4 accent-[#111827]"
            />
            <span className="text-xs font-black uppercase tracking-widest text-[#4B5563]">Archived</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition-all hover:text-[#111827]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-black text-white transition-all hover:bg-[#374151] disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Row
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AccountOptions({ value, accounts }: { value: string; accounts: AccountOption[] }) {
  return (
    <>
      <option value="">Select account</option>
      {value && !accounts.some((account) => account.name === value) && <option value={value}>{value}</option>}
      {accounts.map((account) => (
        <option key={account.id} value={account.name}>
          {account.name}
        </option>
      ))}
    </>
  );
}

function EditorInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#111827]"
      />
    </label>
  );
}

function EditorSelect({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#111827]"
      >
        {children}
      </select>
    </label>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F4F6]">
        {title.includes('No') ? <CheckCircle2 className="h-7 w-7 text-green-600" /> : <XCircle className="h-7 w-7 text-[#9CA3AF]" />}
      </div>
      <p className="text-lg font-black text-[#111827]">{title}</p>
      <p className="mt-1 text-sm font-bold text-[#6B7280]">{detail}</p>
    </div>
  );
}
