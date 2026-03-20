ALTER TABLE public.user_stories ADD COLUMN device_fingerprint text;

CREATE INDEX idx_user_stories_device_fingerprint ON public.user_stories (device_fingerprint, started_at);