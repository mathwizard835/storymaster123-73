
-- =========================================================
-- PRIVACY-SAFE AGGREGATE ANALYTICS
-- No user_id. No device_id. No child profile data.
-- Ephemeral session tokens rotated by client (~30 min).
-- =========================================================

-- ---------- analytics_events ----------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_category TEXT NOT NULL CHECK (event_category IN (
    'system', 'performance', 'subscription', 'content', 'cache'
  )),
  event_name TEXT NOT NULL CHECK (length(event_name) BETWEEN 1 AND 64),
  -- Ephemeral, rotating, not tied to any user. Client generates a new one
  -- every session/30min. We never store device_id or user_id here.
  session_token TEXT NOT NULL CHECK (length(session_token) BETWEEN 8 AND 64),
  -- Non-identifying numeric / bucketed metadata only. The track-event edge
  -- function strips any field not in the allowlist before insert.
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category_name_time
  ON public.analytics_events (event_category, event_name, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can record events. Validation enforces
-- shape so callers can't dump arbitrary PII into meta.
DROP POLICY IF EXISTS "Anyone can insert anonymous analytics" ON public.analytics_events;
CREATE POLICY "Anyone can insert anonymous analytics"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_category IN ('system','performance','subscription','content','cache')
    AND length(event_name) BETWEEN 1 AND 64
    AND length(session_token) BETWEEN 8 AND 64
    AND jsonb_typeof(meta) = 'object'
    -- Hard cap on metadata size to prevent abuse
    AND length(meta::text) <= 1024
  );

-- Only admins can read raw events.
DROP POLICY IF EXISTS "Admins can read analytics events" ON public.analytics_events;
CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- analytics_daily_rollups ----------
CREATE TABLE IF NOT EXISTS public.analytics_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_date DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_date, metric_key, dimensions)
);

CREATE INDEX IF NOT EXISTS idx_analytics_rollup_date_key
  ON public.analytics_daily_rollups (bucket_date DESC, metric_key);

ALTER TABLE public.analytics_daily_rollups ENABLE ROW LEVEL SECURITY;

-- Only admins can read rollups. Writes happen via service role / edge functions.
DROP POLICY IF EXISTS "Admins can read analytics rollups" ON public.analytics_daily_rollups;
CREATE POLICY "Admins can read analytics rollups"
  ON public.analytics_daily_rollups
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- prompt_hash_counts ----------
-- Frequency-only counter for cached prompt templates. Stores a SHA-256 hash
-- of normalized prompt parameters (theme + length + age bucket), NEVER the
-- raw prompt text and NEVER tied to a user.
CREATE TABLE IF NOT EXISTS public.prompt_hash_counts (
  prompt_hash TEXT PRIMARY KEY CHECK (length(prompt_hash) = 64),
  hit_count BIGINT NOT NULL DEFAULT 0,
  miss_count BIGINT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_hash_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read prompt hash counts" ON public.prompt_hash_counts;
CREATE POLICY "Admins can read prompt hash counts"
  ON public.prompt_hash_counts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Atomic upsert helper for cache hit/miss counters.
CREATE OR REPLACE FUNCTION public.bump_prompt_hash(
  _hash TEXT,
  _hit BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _hash IS NULL OR length(_hash) <> 64 THEN
    RETURN;
  END IF;

  INSERT INTO public.prompt_hash_counts (prompt_hash, hit_count, miss_count, last_seen_at)
  VALUES (_hash, CASE WHEN _hit THEN 1 ELSE 0 END, CASE WHEN _hit THEN 0 ELSE 1 END, now())
  ON CONFLICT (prompt_hash) DO UPDATE
    SET hit_count   = public.prompt_hash_counts.hit_count  + CASE WHEN _hit THEN 1 ELSE 0 END,
        miss_count  = public.prompt_hash_counts.miss_count + CASE WHEN _hit THEN 0 ELSE 1 END,
        last_seen_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.bump_prompt_hash(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_prompt_hash(TEXT, BOOLEAN) TO service_role;
