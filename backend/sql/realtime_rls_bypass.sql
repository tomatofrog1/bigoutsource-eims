-- Enable read access for the anon role so that Supabase Realtime can broadcast changes
-- Note: This makes the data readable via the anon key. 
-- Since your app uses a custom backend for API access, make sure you understand the implications of exposing these tables to the public anon key.

BEGIN;
  -- For employees
  CREATE POLICY "Enable read access for anon" ON "public"."employees" AS PERMISSIVE FOR SELECT TO anon USING (true);
  
  -- For audit_logs
  CREATE POLICY "Enable read access for anon" ON "public"."audit_logs" AS PERMISSIVE FOR SELECT TO anon USING (true);

  -- For accounts
  CREATE POLICY "Enable read access for anon" ON "public"."accounts" AS PERMISSIVE FOR SELECT TO anon USING (true);
COMMIT;
