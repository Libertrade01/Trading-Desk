-- ChatGPT OAuth session store for Login with ChatGPT SDK (service-role only).

CREATE TABLE IF NOT EXISTS chatgpt_sessions (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatgpt_sessions_expires_at_idx
  ON chatgpt_sessions (expires_at);

ALTER TABLE chatgpt_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON chatgpt_sessions FROM anon;
REVOKE ALL ON chatgpt_sessions FROM authenticated;

CREATE TABLE IF NOT EXISTS chatgpt_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatgpt_kv_expires_at_idx
  ON chatgpt_kv (expires_at);

ALTER TABLE chatgpt_kv ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON chatgpt_kv FROM anon;
REVOKE ALL ON chatgpt_kv FROM authenticated;
