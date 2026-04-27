ALTER TABLE public.analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_event_category_check;

ALTER TABLE public.analytics_events
ADD CONSTRAINT analytics_events_event_category_check
CHECK (event_category = ANY (ARRAY[
  'system'::text,
  'performance'::text,
  'subscription'::text,
  'content'::text,
  'cache'::text,
  'funnel'::text
]));