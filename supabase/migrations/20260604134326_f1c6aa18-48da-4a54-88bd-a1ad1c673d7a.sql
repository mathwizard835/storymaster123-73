CREATE TABLE public.reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id text NOT NULL,
  story_title text,
  words_read integer NOT NULL DEFAULT 0,
  reading_time_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reading_sessions_user_completed_idx
  ON public.reading_sessions (user_id, completed_at DESC);

GRANT SELECT, INSERT ON public.reading_sessions TO authenticated;
GRANT ALL ON public.reading_sessions TO service_role;

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading sessions"
  ON public.reading_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reading sessions"
  ON public.reading_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());