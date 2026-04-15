## Problem Analysis

Two related issues:

1. **Dashboard doesn't update after starting a story** — The `syncProgressFromDatabase` function only counts stories with `status = 'completed'`. Since the user has zero completed stories (all are active/paused), it resets localStorage achievements to zeros every time the Dashboard loads. This wipes any local progress.
2. **"Start Your First Adventure" shows incorrectly** — The Dashboard checks `recentStories.length === 0` for stories and `unlockedAchievements.length === 0` for achievements. The recent stories check should work (loadRecentStoriesFromDatabase includes active/paused), but the achievements section shows "Start Your First Adventure" because sync keeps resetting achievements to empty.

**Root cause**: `syncProgressFromDatabase` should also count active/paused stories as progress indicators (at minimum for "stories started"), and the "first_story" achievement should unlock when the user starts (not finishes) their first story. Additionally, the empty-state messages should account for in-progress stories.

## Plan

### 1. Fix syncProgressFromDatabase to include all stories (syncProgress.ts)

- Change the query from `status = 'completed'` to include `active`, `paused`, and `completed` stories
- Only count completed stories toward `totalStories` for achievement thresholds that require completion
- Add a new `totalStoriesStarted` field to track stories begun (for the "first_story" achievement)
- When there are active/paused stories but zero completed, do NOT reset localStorage to defaults

### 2. Update achievement definitions and checks (achievements.ts)

- Change `first_story` achievement to trigger on starting a story (totalStoriesStarted >= 1) rather than completing one
- Keep other achievements (story_master, legend) based on completed stories
- Add `totalStoriesStarted` to the `AchievementProgress` type

### 3. Fix empty-state messaging (Dashboard.tsx)

- Change the achievements section empty state condition: show "Start Your First Adventure" only when `totalStoryCount === 0` AND `inProgressStories.length === 0` (truly no stories at all)
- When there are in-progress stories but no achievements yet, show a different message like "Complete a story to earn achievements"

### Files Modified

- `src/lib/achievements.ts` — Add `totalStoriesStarted` field, update `first_story` check
- `src/lib/syncProgress.ts` — Query all statuses, populate `totalStoriesStarted`, don't reset when only in-progress stories exist
- `src/pages/Dashboard.tsx` — Fix empty-state conditions for achievements section
- `src/pages/Achievements.tsx` — Show `totalStoriesStarted` context if no achievements yet