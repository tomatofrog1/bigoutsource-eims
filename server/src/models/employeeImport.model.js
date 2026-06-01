import { randomUUID } from 'node:crypto';
import { supabaseRequest } from '../config/supabase.js';

const TABLE = 'employee_import_staging';

function toDatabasePayload(row) {
  return {
    id: row.id || randomUUID(),
    import_batch_id: row.importBatchId,
    source_sheet: row.sourceSheet || 'IT Master Tracker',
    source_row: row.sourceRow || null,
    raw_data: row.rawData || {},
    normalized_data: row.normalizedData || {},
    issues: row.issues || [],
    status: row.status || 'issue',
    duplicate_key: row.duplicateKey || null,
    resolution: row.resolution || null,
    created_by: row.createdBy || null,
    created_at: row.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    importBatchId: row.import_batch_id,
    sourceSheet: row.source_sheet,
    sourceRow: row.source_row,
    rawData: row.raw_data || {},
    normalizedData: row.normalized_data || {},
    issues: row.issues || [],
    status: row.status,
    duplicateKey: row.duplicate_key,
    resolution: row.resolution,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const EmployeeImportModel = {
  async insertMany(rows) {
    if (!rows.length) return [];

    const created = await supabaseRequest(TABLE, {
      method: 'POST',
      body: rows.map(toDatabasePayload),
    });

    return created.map(normalize);
  },

  async findAll(filters = {}) {
    const searchParams = {
      select: '*',
      order: 'created_at.desc',
      limit: String(Math.min(Number(filters.limit || 1000), 2000)),
    };

    if (filters.importBatchId) searchParams.import_batch_id = `eq.${filters.importBatchId}`;
    if (filters.status) searchParams.status = `eq.${filters.status}`;

    const rows = await supabaseRequest(TABLE, { searchParams });
    return rows.map(normalize);
  },

  async findById(id) {
    const rows = await supabaseRequest(TABLE, {
      searchParams: {
        select: '*',
        id: `eq.${id}`,
        limit: '1',
      },
    });

    return normalize(rows[0]);
  },

  async countUnresolvedIssues() {
    const rows = await supabaseRequest(TABLE, {
      searchParams: {
        select: 'id',
        status: 'eq.issue',
        limit: '2000',
      },
    });

    return rows.length;
  },

  async update(id, data) {
    const payload = toDatabasePayload({
      id,
      importBatchId: data.importBatchId,
      sourceSheet: data.sourceSheet,
      sourceRow: data.sourceRow,
      rawData: data.rawData,
      normalizedData: data.normalizedData,
      issues: data.issues,
      status: data.status,
      duplicateKey: data.duplicateKey,
      resolution: data.resolution,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
    });

    delete payload.id;
    delete payload.created_at;

    const rows = await supabaseRequest(TABLE, {
      method: 'PATCH',
      searchParams: { id: `eq.${id}` },
      body: payload,
    });

    return normalize(rows[0]);
  },

  async remove(id) {
    const rows = await supabaseRequest(TABLE, {
      method: 'DELETE',
      searchParams: { id: `eq.${id}` },
    });

    return rows.map(normalize);
  },
};
