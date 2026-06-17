import { supabaseRequest } from '../../config/supabase.js';

const SETTINGS_ID = 'global';

const DEFAULT_SETTINGS = {
  companyName: 'BigOutsource',
  notifyRegistrationAttempts: true,
  notifySystemAlerts: true,
};

function normalize(row) {
  if (!row) return DEFAULT_SETTINGS;

  return {
    companyName: row.company_name || DEFAULT_SETTINGS.companyName,
    notifyRegistrationAttempts: row.notify_registration_attempts ?? DEFAULT_SETTINGS.notifyRegistrationAttempts,
    notifySystemAlerts: row.notify_system_alerts ?? DEFAULT_SETTINGS.notifySystemAlerts,
    updatedAt: row.updated_at || null,
  };
}

function toDatabasePayload(data) {
  const payload = {
    id: SETTINGS_ID,
  };

  if (data.companyName !== undefined) payload.company_name = String(data.companyName).trim() || DEFAULT_SETTINGS.companyName;
  if (data.notifyRegistrationAttempts !== undefined) payload.notify_registration_attempts = Boolean(data.notifyRegistrationAttempts);
  if (data.notifySystemAlerts !== undefined) payload.notify_system_alerts = Boolean(data.notifySystemAlerts);

  return payload;
}

export const SettingsModel = {
  async get() {
    const rows = await supabaseRequest('app_settings', {
      searchParams: {
        select: '*',
        id: `eq.${SETTINGS_ID}`,
        limit: '1',
      },
    });

    return normalize(rows[0]);
  },

  async update(data) {
    const rows = await supabaseRequest('app_settings', {
      method: 'POST',
      searchParams: {
        on_conflict: 'id',
      },
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: toDatabasePayload(data),
    });

    return normalize(rows[0]);
  },
};
