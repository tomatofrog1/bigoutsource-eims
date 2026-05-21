import { env } from './env.js';
import { AppError } from '../utils/apiResponse.js';
import { createClient } from '@supabase/supabase-js';

const restBaseUrl = `${env.supabase.url.replace(/\/$/, '')}/rest/v1`;

export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseAuth = createClient(env.supabase.url, env.supabase.publishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function buildUrl(resource, searchParams = {}) {
  const url = new URL(`${restBaseUrl}/${resource}`);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export async function supabaseRequest(resource, options = {}) {
  const { method = 'GET', searchParams, body, headers = {} } = options;
  const response = await fetch(buildUrl(resource, searchParams), {
    method,
    headers: {
      apikey: env.supabase.serviceRoleKey,
      Authorization: `Bearer ${env.supabase.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(method !== 'GET' ? { Prefer: 'return=representation' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = payload?.message || payload?.hint || payload || 'Supabase request failed';
    throw new AppError(message, response.status);
  }

  return payload ?? null;
}
