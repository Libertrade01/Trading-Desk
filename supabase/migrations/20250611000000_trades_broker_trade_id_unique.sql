-- Enables upsert dedup by broker_trade_id (optional — import currently replaces by date)
ALTER TABLE trades
  ADD CONSTRAINT trades_broker_trade_id_key UNIQUE (broker_trade_id);
