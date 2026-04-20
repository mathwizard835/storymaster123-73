-- Add a flag to mark a story as publicly viewable via share link
ALTER TABLE public.user_stories
  ADD COLUMN IF NOT EXISTS shared_publicly boolean NOT NULL DEFAULT false;

-- Index for fast lookup of shared stories
CREATE INDEX IF NOT EXISTS idx_user_stories_shared_publicly
  ON public.user_stories (id)
  WHERE shared_publicly = true;

-- Allow anyone (anon + authenticated) to SELECT a story when its owner shared it
CREATE POLICY "Anyone can view publicly shared stories"
  ON public.user_stories
  FOR SELECT
  TO anon, authenticated
  USING (shared_publicly = true);
