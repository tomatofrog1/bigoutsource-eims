create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_role text,
  message text not null,
  entity_type text not null,
  entity_id text not null,
  entity_label text,
  action_url text,
  details jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists type text not null default 'general';
alter table public.notifications add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_role text;
alter table public.notifications add column if not exists message text not null default '';
alter table public.notifications add column if not exists entity_type text not null default '';
alter table public.notifications add column if not exists entity_id text not null default '';
alter table public.notifications add column if not exists entity_label text;
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

create index if not exists notifications_recipient_created_at_idx
on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications (recipient_id)
where read_at is null;

alter table public.notifications enable row level security;

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.notifications to service_role;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
on public.notifications
for select
to authenticated
using ((select auth.uid()) = recipient_id);

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

do $$
begin
  if to_regclass('public.roles') is not null then
    update public.roles
    set
      capabilities = case
        when coalesce(capabilities, '{}'::text[]) @> array['notifications.employee_added']::text[] then capabilities
        else coalesce(capabilities, '{}'::text[]) || array['notifications.employee_added']::text[]
      end,
      updated_at = now()
    where slug in ('super_admin', 'admin', 'hr_admin', 'it_admin', 'viewer');
  end if;
end $$;
