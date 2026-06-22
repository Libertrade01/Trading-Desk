-- Lock down legacy tables not exposed to browser clients.
-- Edge functions use service_role (bypasses RLS). Anon/authenticated get no access.

DO $$
DECLARE
  t text;
  pol record;
  legacy_tables text[] := ARRAY[
    'trade_tags',
    'activations',
    'intraday_journal',
    'agent_reports',
    'agent_memory',
    'rule_compliance',
    'daily_plays',
    'weekly_reviews'
  ];
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
      END LOOP;
      EXECUTE format('REVOKE ALL ON %I FROM anon', t);
      EXECUTE format('REVOKE ALL ON %I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
