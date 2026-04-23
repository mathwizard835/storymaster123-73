DROP POLICY IF EXISTS "Anyone can insert anonymous analytics" ON public.analytics_events;

CREATE POLICY "Anyone can insert anonymous analytics"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (event_category = ANY (ARRAY['system'::text, 'performance'::text, 'subscription'::text, 'content'::text, 'cache'::text, 'funnel'::text]))
  AND (length(event_name) >= 1 AND length(event_name) <= 64)
  AND (length(session_token) >= 8 AND length(session_token) <= 64)
  AND (jsonb_typeof(meta) = 'object'::text)
  AND (length((meta)::text) <= 1024)
);