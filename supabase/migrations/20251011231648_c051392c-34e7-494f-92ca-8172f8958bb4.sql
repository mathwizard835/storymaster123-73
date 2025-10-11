-- Phase 2: Clean up duplicate active stories, then add unique index

-- First, mark all but the most recent active story as 'completed' for each user
UPDATE user_stories 
SET status = 'completed',
    completed_at = COALESCE(completed_at, NOW())
WHERE id NOT IN (
  -- Keep only the most recently played active story for each user
  SELECT DISTINCT ON (user_id) id
  FROM user_stories
  WHERE status = 'active'
  ORDER BY user_id, last_played_at DESC
)
AND status = 'active';

-- Now create the unique partial index (should succeed after cleanup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_story_per_user 
ON user_stories(user_id) 
WHERE status = 'active';

-- Add comment for documentation
COMMENT ON INDEX idx_one_active_story_per_user IS 'Ensures only one active story per user to prevent story contamination';

-- Add helpful log to confirm cleanup
DO $$
BEGIN
  RAISE NOTICE 'Successfully cleaned up duplicate active stories and created unique constraint';
END $$;