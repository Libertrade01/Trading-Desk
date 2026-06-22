-- RLS for trade_notes and trade_tag_links (ownership via trades.user_id)

ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_notes_select_own" ON trade_notes;
DROP POLICY IF EXISTS "trade_notes_insert_own" ON trade_notes;
DROP POLICY IF EXISTS "trade_notes_update_own" ON trade_notes;
DROP POLICY IF EXISTS "trade_notes_delete_own" ON trade_notes;

CREATE POLICY "trade_notes_select_own" ON trade_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_notes.trade_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_notes_insert_own" ON trade_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_notes.trade_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_notes_update_own" ON trade_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_notes.trade_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_notes.trade_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_notes_delete_own" ON trade_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_notes.trade_id AND t.user_id = auth.uid()
    )
  );

ALTER TABLE trade_tag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_tag_links_select_own" ON trade_tag_links;
DROP POLICY IF EXISTS "trade_tag_links_insert_own" ON trade_tag_links;
DROP POLICY IF EXISTS "trade_tag_links_delete_own" ON trade_tag_links;

CREATE POLICY "trade_tag_links_select_own" ON trade_tag_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_tag_links.trade_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_tag_links_insert_own" ON trade_tag_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_tag_links.trade_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_tag_links_delete_own" ON trade_tag_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_tag_links.trade_id AND t.user_id = auth.uid()
    )
  );
