
CREATE TABLE public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  platform TEXT,
  route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX app_sessions_user_started_idx ON public.app_sessions (user_id, started_at DESC);
CREATE INDEX app_sessions_started_idx ON public.app_sessions (started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.app_sessions TO authenticated;
GRANT ALL ON public.app_sessions TO service_role;

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own app sessions"
  ON public.app_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app sessions"
  ON public.app_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app sessions"
  ON public.app_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all app sessions"
  ON public.app_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
