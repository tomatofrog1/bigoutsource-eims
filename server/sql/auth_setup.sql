create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'viewer',
  status text not null default 'pending',
  department text not null default 'Unassigned',
  site text not null default 'HQ',
  capability_overrides text[],
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles add column if not exists full_name text not null default '';
alter table public.user_profiles add column if not exists department text not null default 'Unassigned';
alter table public.user_profiles add column if not exists site text not null default 'HQ';
alter table public.user_profiles add column if not exists capability_overrides text[];
alter table public.user_profiles add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.user_profiles add column if not exists approved_at timestamptz;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles drop constraint if exists user_profiles_status_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer'));

alter table public.user_profiles
  add constraint user_profiles_status_check
  check (status in ('pending', 'active', 'disabled'));

alter table public.user_profiles enable row level security;

grant select on public.user_profiles to authenticated;
grant select, insert, update on public.user_profiles to service_role;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create table if not exists public.app_settings (
  id text primary key default 'global',
  company_name text not null default 'BigOutsource',
  notify_registration_attempts boolean not null default true,
  notify_system_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings add column if not exists company_name text not null default 'BigOutsource';
alter table public.app_settings add column if not exists notify_registration_attempts boolean not null default true;
alter table public.app_settings add column if not exists notify_system_alerts boolean not null default true;
alter table public.app_settings add column if not exists created_at timestamptz not null default now();
alter table public.app_settings add column if not exists updated_at timestamptz not null default now();

insert into public.app_settings (id, company_name)
values ('global', 'BigOutsource')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

grant select, insert, update on public.app_settings to service_role;
