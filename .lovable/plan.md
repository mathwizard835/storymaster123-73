

## Bug Analysis and Fix Plan

### Root Causes

**Bug 1 & 2: Achievements and choices not updating on dashboard**

In `syncProgressFromDatabase()` (syncProgress.ts), the code manually builds an `achievementProgress` object with correct totals from the database (lines 68-74, 82-100). However, it **never saves this object to localStorage**. It then calls `updateProgress([], '', 0)` which internally calls `loadAchievements()` — reading from localStorage (which is empty/stale), adds +1 to totalStories, and saves *that*. The carefully computed totals are discarded.

The dashboard then calls `loadAchievements()` (line 86 of Dashboard.tsx), which reads the same stale localStorage.

**Bug 3: Story Gallery empty after starting stories**

`loadCompletedStoriesFromDatabase()` filters by `status = 'completed'` only. Stories that are `active` or `paused` never appear in the gallery. This is technically by design, but the gallery page gives no indication that in-progress stories exist elsewhere.

### Plan

**1. Fix achievement sync persistence (syncProgress.ts)**
- After building `achievementProgress` with correct DB-derived totals, call `saveAchievements(achievementProgress)` to persist it to localStorage *before* checking for new achievement unlocks.
- Replace the `updateProgress([], '', 0)` call with direct achievement-checking logic that doesn't re-increment counters. The function will iterate `ALL_ACHIEVEMENTS`, check unlock conditions against the already-computed totals, add newly unlocked achievements to the progress object, and save again.

**2. Fix choices metric on dashboard (same fix)**
- Since `achievementProgress.totalChoices` is correctly computed in the sync loop but never persisted, the fix in step 1 (saving to localStorage) automatically resolves this. The dashboard's `loadAchievements()` call will now read correct choice counts.

**3. Show in-progress stories in Story Gallery (StoryGallery.tsx + databaseStory.ts)**
- Add a new function `loadAllUserStoriesFromDatabase()` that fetches stories with status `active`, `paused`, OR `completed`.
- Update StoryGallery to load all stories (not just completed) and display in-progress stories with a visual indicator (e.g., "In Progress" badge, different card styling).
- Group or sort stories so completed ones appear first, with in-progress stories in a separate section above.

### Files Modified
- `src/lib/syncProgress.ts` — save achievementProgress to localStorage, fix achievement checking
- `src/pages/StoryGallery.tsx` — show in-progress stories alongside completed ones
- `src/lib/databaseStory.ts` — add function to load all user stories (not just completed)

