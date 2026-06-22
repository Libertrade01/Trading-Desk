-- Drop legacy open policies that bypass per-user RLS (live DB audit fix)

-- app_data
DROP POLICY IF EXISTS "Allow all operations" ON app_data;
DROP POLICY IF EXISTS "auth all app_data" ON app_data;

-- trades
DROP POLICY IF EXISTS "Allow all operations" ON trades;
DROP POLICY IF EXISTS "Allow all" ON trades;
DROP POLICY IF EXISTS "auth all trades" ON trades;

-- trading_days
DROP POLICY IF EXISTS "Allow all operations" ON trading_days;
DROP POLICY IF EXISTS "Allow all" ON trading_days;
DROP POLICY IF EXISTS "auth all trading_days" ON trading_days;

-- trade_notes / trade_tag_links
DROP POLICY IF EXISTS "allow all" ON trade_notes;
DROP POLICY IF EXISTS "allow all" ON trade_tag_links;

-- Per-user policies (idempotent)
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

CREATE POLICY "app_data_select_system" ON app_data
  FOR SELECT USING (user_id IS NULL AND auth.uid() IS NOT NULL);

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trading_days'
  ) THEN
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

DROP POLICY IF EXISTS "trade_notes_select_own" ON trade_notes;
DROP POLICY IF EXISTS "trade_notes_insert_own" ON trade_notes;
DROP POLICY IF EXISTS "trade_notes_update_own" ON trade_notes;
DROP POLICY IF EXISTS "trade_notes_delete_own" ON trade_notes;

CREATE POLICY "trade_notes_select_own" ON trade_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_notes.trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_notes_insert_own" ON trade_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_notes.trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_notes_update_own" ON trade_notes
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_notes.trade_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_notes.trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_notes_delete_own" ON trade_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_notes.trade_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trade_tag_links_select_own" ON trade_tag_links;
DROP POLICY IF EXISTS "trade_tag_links_insert_own" ON trade_tag_links;
DROP POLICY IF EXISTS "trade_tag_links_delete_own" ON trade_tag_links;

CREATE POLICY "trade_tag_links_select_own" ON trade_tag_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_tag_links.trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_tag_links_insert_own" ON trade_tag_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_tag_links.trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_tag_links_delete_own" ON trade_tag_links
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM trades t WHERE t.id::text = trade_tag_links.trade_id AND t.user_id = auth.uid())
  );
