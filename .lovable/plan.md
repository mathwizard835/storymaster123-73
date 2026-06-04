# Fix Parent Dashboard reading session sync

## Root cause

`src/lib/readingAnalytics.ts` writes to and reads from a `public.reading_sessions` table — but that table does **not exist** in the database (verified via information_schema). Every `trackReadingSession` / `trackSceneReading` call silently errors out. The Parent Dashboard never sees real per-scene reading data; it only renders the rough fallback that estimates 150 words / 45 sec per scene from `user_stories`, which is the same number on every device and never updates mid-story.

## Fix (single migration, no code changes)

Create `public.reading_sessions` with the exact shape the existing client code already inserts/selects, plus proper RLS and grants so cross-device sync works for authenticated users.

```sql
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
```

No UPDATE/DELETE policies — sessions are append-only.

## Why this is enough

- `trackSceneReading` already fires on every scene save in `Mission.tsx` (line 925) and `trackReadingSession` on completion (line 1481). Once the table exists, inserts will succeed.
- `getReadingStats` already queries by `user_id` and falls back to estimating from `user_stories` when no rows exist — so old completed stories still show data while new sessions accumulate accurate per-scene minutes/words.
- ParentDashboard already calls `syncProgressFromDatabase()` on mount and re-reads via `useProgressSync`, so cross-device refresh works as soon as the table is reachable.
- `readingAnalytics.ts` already casts the client to `any` to bypass missing generated types, so no client code edits are needed; the regenerated `types.ts` will pick up the table automatically.

## Out of scope

No changes to `Mission.tsx`, `ParentDashboard.tsx`, `readingAnalytics.ts`, `syncProgress.ts`, or any UI. Single migration only.
