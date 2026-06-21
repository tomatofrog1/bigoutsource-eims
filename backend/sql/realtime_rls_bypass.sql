-- Enable read access for the authenticated role so that Supabase Realtime can broadcast changes securely.
-- Note: This makes the data readable via the authenticated key.
-- Since the app relies on Realtime to broadcast UI updates, we grant SELECT to authenticated users.

BEGIN;
  -- For employees
  DROP POLICY IF EXISTS "Enable read access for anon" ON "public"."employees";
  CREATE POLICY "Enable read access for authenticated users" ON "public"."employees" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  
  -- For audit_logs
  DROP POLICY IF EXISTS "Enable read access for anon" ON "public"."audit_logs";
  CREATE POLICY "Enable read access for authenticated users" ON "public"."audit_logs" AS PERMISSIVE FOR SELECT TO authenticated USING (true);

  -- For accounts
  DROP POLICY IF EXISTS "Enable read access for anon" ON "public"."accounts";
  CREATE POLICY "Enable read access for authenticated users" ON "public"."accounts" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
COMMIT;
