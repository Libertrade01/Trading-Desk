-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create the key-value storage table
CREATE TABLE IF NOT EXISTS app_data (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations with the anon key
-- Since this is a single-user app, this is sufficient
CREATE POLICY "Allow all operations" ON app_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create an index for faster prefix searches (used by the list function)
CREATE INDEX IF NOT EXISTS idx_app_data_key ON app_data (key);
