-- Enable Realtime for specific tables
begin;
  -- Create publication if it doesn't exist
  do $$ 
  begin 
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then 
      create publication supabase_realtime; 
    end if; 
  end $$;

  -- Remove tables if they are already there to avoid duplicate errors, then add them
  -- We just try to add them and catch the error if it already exists in the publication
  do $$
  declare
    t text;
    tables_to_add text[] := array[
      'employees', 
      'accounts', 
      'user_profiles', 
      'audit_logs', 
      'app_settings', 
      'roles'
    ];
  begin
    foreach t in array tables_to_add loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then
        -- Ignore if the table is already in the publication
      end;
    end loop;
  end $$;

  -- Set Replica Identity to FULL for tables where we need the complete 'old' record on UPDATE/DELETE
  alter table public.employees replica identity full;
  alter table public.accounts replica identity full;
  alter table public.user_profiles replica identity full;
commit;
