create table if not exists public.employee_import_staging (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  source_sheet text not null default 'IT Master Tracker',
  source_row integer,
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  status text not null default 'issue' check (status in ('ready', 'issue', 'imported', 'skipped')),
  duplicate_key text,
  resolution jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_import_staging_batch_idx
  on public.employee_import_staging (import_batch_id);

create index if not exists employee_import_staging_status_idx
  on public.employee_import_staging (status);

create index if not exists employee_import_staging_duplicate_idx
  on public.employee_import_staging (duplicate_key)
  where duplicate_key is not null;
