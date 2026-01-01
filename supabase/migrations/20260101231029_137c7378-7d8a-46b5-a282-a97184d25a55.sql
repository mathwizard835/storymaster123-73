-- Drop the existing check constraint and add a new one that includes 'paused'
ALTER TABLE public.user_stories DROP CONSTRAINT user_stories_status_check;

ALTER TABLE public.user_stories ADD CONSTRAINT user_stories_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text, 'paused'::text]));