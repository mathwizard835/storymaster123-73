-- Anonymous funnel analytics for the guest story-first flow.
-- Intentionally has NO user_id and NO foreign keys to auth.users.
CREATE TABLE public.guest_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event text NOT NULL,
  story_slug text,
  scene_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_analytics_event ON public.guest_analytics(event);
CREATE INDEX idx_guest_analytics_created_at ON public.guest_analytics(created_at DESC);
CREATE INDEX idx_guest_analytics_session ON public.guest_analytics(session_id);

ALTER TABLE public.guest_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) may insert an event. No PII is collected.
CREATE POLICY "Anyone can record guest analytics"
ON public.guest_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) <= 100
  AND event IS NOT NULL
  AND length(event) <= 60
);

-- Only admins can read the analytics.
CREATE POLICY "Admins can read guest analytics"
ON public.guest_analytics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));