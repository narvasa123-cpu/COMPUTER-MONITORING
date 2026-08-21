CREATE TABLE IF NOT EXISTS public.monitoring_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.monitoring_state ENABLE ROW LEVEL SECURITY;

-- The Cloudflare Worker uses Supabase's server-only secret key, which bypasses RLS.
-- No browser role is granted direct access to this internal state table.
