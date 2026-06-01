alter table if exists public.accounts
  add column if not exists department_code text;

update public.accounts
set department_code = lower(
  regexp_replace(
    (
      select string_agg(left(word, 1), '')
      from regexp_split_to_table(public.accounts.name, '\s+') as word
      where word <> ''
    ),
    '[^a-z]',
    '',
    'g'
  )
)
where department_code is null or department_code = '';

alter table if exists public.accounts
  alter column department_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_department_code_format_check'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_department_code_format_check
      check (department_code ~ '^[a-z]+$');
  end if;
end $$;

create unique index if not exists accounts_department_code_unique
  on public.accounts (department_code);
