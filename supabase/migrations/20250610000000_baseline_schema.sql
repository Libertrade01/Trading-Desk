-- Baseline schema documentation for Libertrade Trade Desk production tables.
-- Idempotent: safe on fresh DBs and existing deployments (Phase 1 alters may follow).

-- ============================================================
-- app_data: per-user key-value storage (+ system rows with user_id NULL)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_data_key ON app_data (key);
CREATE INDEX IF NOT EXISTS idx_app_data_user_id ON app_data (user_id);

-- ============================================================
-- trades: imported broker fills + analytics fields
-- ============================================================

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_trade_id text,
  entry_time timestamptz,
  exit_time timestamptz,
  date date,
  instrument text,
  direction text,
  quantity numeric,
  entry_price numeric,
  exit_price numeric,
  gross_pnl numeric,
  commission numeric,
  net_pnl numeric,
  platform text,
  account_name text,
  account_type text,
  stop_loss_points numeric,
  setup text,
  management text,
  sequence_id text,
  post_exit_outcome text
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades (user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades (date);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades (entry_time);

-- ============================================================
-- trading_days: rule compliance + missed-play tracking (analytics reports)
-- ============================================================

CREATE TABLE IF NOT EXISTS trading_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  rules_trend text,
  rules_market_cond text,
  rules_top_bottom text,
  rules_plays text,
  rules_execution text,
  rules_focus text,
  rules_consol text,
  rules_dll text,
  rules_cooloff text,
  bull1_result text,
  bull1_traded text,
  bull1_description text,
  bull1_why_not text,
  bull2_result text,
  bull2_traded text,
  bull2_description text,
  bull2_why_not text,
  bear1_result text,
  bear1_traded text,
  bear1_description text,
  bear1_why_not text,
  bear2_result text,
  bear2_traded text,
  bear2_description text,
  bear2_why_not text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trading_days_user_id ON trading_days (user_id);
CREATE INDEX IF NOT EXISTS idx_trading_days_date ON trading_days (date);

-- ============================================================
-- trade_notes: free-text notes per trade (analytics trade detail)
-- ============================================================

CREATE TABLE IF NOT EXISTS trade_notes (
  trade_id uuid PRIMARY KEY REFERENCES trades(id) ON DELETE CASCADE,
  notes text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- trade_tag_links: legacy tag associations (deprecated UI, table retained)
-- ============================================================

CREATE TABLE IF NOT EXISTS trade_tag_links (
  trade_id uuid NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL,
  PRIMARY KEY (trade_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_tag_links_trade_id ON trade_tag_links (trade_id);
