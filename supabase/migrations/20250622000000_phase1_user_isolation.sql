-- Phase 1: Per-user data isolation + RLS for Libertrade SaaS
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`
-- Orphan rows (user_id IS NULL) are claimed by POST /api/auth/founder-migrate

-- ============================================================
-- app_data: user_id + composite unique (user_id, key)
-- Surrogate id PK allows NULL user_id orphans until founder migration
-- ============================================================

ALTER TABLE app_data ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
UPDATE app_data SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE app_data ALTER COLUMN id SET NOT NULL;
ALTER TABLE app_data ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE app_data DROP CONSTRAINT IF EXISTS app_data_pkey;
ALTER TABLE app_data ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE app_data ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS app_data_user_key_idx
  ON app_data (user_id, key)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_data_orphan_key_idx
  ON app_data (key)
  WHERE user_id IS NULL;

-- ============================================================
-- trades: user_id + unique (user_id, broker_trade_id)
-- ============================================================

ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades (user_id);

ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_broker_trade_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS trades_user_broker_trade_id_idx
  ON trades (user_id, broker_trade_id)
  WHERE user_id IS NOT NULL AND broker_trade_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trades_orphan_broker_trade_id_idx
  ON trades (broker_trade_id)
  WHERE user_id IS NULL AND broker_trade_id IS NOT NULL;

-- ============================================================
-- trading_days: user_id column (analytics)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trading_days'
  ) THEN
    ALTER TABLE trading_days ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_trading_days_user_id ON trading_days (user_id);
  END IF;
END $$;

-- ============================================================
-- RLS: app_data
-- ============================================================

ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON app_data;
DROP POLICY IF EXISTS "app_data_select_own" ON app_data;
DROP POLICY IF EXISTS "app_data_insert_own" ON app_data;
DROP POLICY IF EXISTS "app_data_update_own" ON app_data;
DROP POLICY IF EXISTS "app_data_delete_own" ON app_data;
DROP POLICY IF EXISTS "app_data_select_system" ON app_data;

CREATE POLICY "app_data_select_own" ON app_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "app_data_insert_own" ON app_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "app_data_update_own" ON app_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "app_data_delete_own" ON app_data
  FOR DELETE USING (auth.uid() = user_id);

-- Shared system rows (cron econ cache): read-only for authenticated users
CREATE POLICY "app_data_select_system" ON app_data
  FOR SELECT USING (user_id IS NULL AND auth.uid() IS NOT NULL);

-- ============================================================
-- RLS: trades
-- ============================================================

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON trades;
DROP POLICY IF EXISTS "trades_select_own" ON trades;
DROP POLICY IF EXISTS "trades_insert_own" ON trades;
DROP POLICY IF EXISTS "trades_update_own" ON trades;
DROP POLICY IF EXISTS "trades_delete_own" ON trades;

CREATE POLICY "trades_select_own" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trades_insert_own" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trades_update_own" ON trades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trades_delete_own" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RLS: trading_days
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trading_days'
  ) THEN
    ALTER TABLE trading_days ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all operations" ON trading_days;
    DROP POLICY IF EXISTS "trading_days_select_own" ON trading_days;
    DROP POLICY IF EXISTS "trading_days_insert_own" ON trading_days;
    DROP POLICY IF EXISTS "trading_days_update_own" ON trading_days;
    DROP POLICY IF EXISTS "trading_days_delete_own" ON trading_days;

    EXECUTE $p$
      CREATE POLICY "trading_days_select_own" ON trading_days
        FOR SELECT USING (auth.uid() = user_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "trading_days_insert_own" ON trading_days
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "trading_days_update_own" ON trading_days
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "trading_days_delete_own" ON trading_days
        FOR DELETE USING (auth.uid() = user_id)
    $p$;
  END IF;
END $$;
