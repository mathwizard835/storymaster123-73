
## Problem

Achievements and Character data don't update in real-time. They only refresh when:
- User manually navigates back to Dashboard/Achievements/ParentDashboard pages
- The page is fully reloaded

When the user makes a choice in a story or finishes a scene, XP/achievements update in localStorage and the database, but the Dashboard/Achievements pages already loaded their state into React state and don't re-fetch.

## Root Cause

Looking at `Dashboard.tsx`, `Achievements.tsx`, and `ParentDashboard.tsx`:
- They load `loadCharacter()` and `loadAchievements()` once in `useEffect` on mount
- There's no listener for changes to localStorage or database
- No Supabase realtime subscription on `user_stories`
- No window focus/visibility refresh
- No custom event broadcast when XP/achievements change

Meanwhile, `gainSceneExperience` and `gainExperience` in `character.ts` update localStorage, and `updateProgress` in `achievements.ts` does the same — but nothing tells the dashboard to re-render.

## Plan

### 1. Add a lightweight event bus for progress updates (`src/lib/progressEvents.ts` — new file)
- Tiny pub/sub: `emitProgressUpdate()` and `onProgressUpdate(cb)` using `window.dispatchEvent` + `CustomEvent('smq:progress-updated')`
- Also dispatch on `storage` events (cross-tab sync via localStorage)

### 2. Emit events from progress mutators
- `src/lib/character.ts`: call `emitProgressUpdate()` inside `saveCharacter()`
- `src/lib/achievements.ts`: call `emitProgressUpdate()` inside `saveAchievements()`

This means every place that already saves character/achievements (Mission scenes, story completion, sync) will automatically broadcast.

### 3. Add a reusable hook (`src/hooks/useProgressSync.ts` — new file)
- `useProgressSync(callback)`: subscribes to the custom event + `storage` event + `visibilitychange` (refresh when tab becomes visible again) + window `focus`
- Handles cleanup automatically

### 4. Wire pages to the hook
- `src/pages/Dashboard.tsx`: call `useProgressSync(loadData)` so character/achievements/stories refresh whenever progress changes
- `src/pages/Achievements.tsx`: refactor data loading into a `loadData` callback and call `useProgressSync(loadData)`
- `src/pages/ParentDashboard.tsx`: same treatment — refresh character/achievements/streaks/reading stats on event

### 5. Add Supabase realtime for cross-device sync (Dashboard only)
- In Dashboard, subscribe to `user_stories` changes for the current user via `supabase.channel(...).on('postgres_changes', ...)` 
- On any change, trigger `loadData()` so a story finished on mobile updates the web dashboard within seconds

## Files Modified
- **NEW** `src/lib/progressEvents.ts` — event bus
- **NEW** `src/hooks/useProgressSync.ts` — subscription hook
- `src/lib/character.ts` — emit on save
- `src/lib/achievements.ts` — emit on save
- `src/pages/Dashboard.tsx` — wire hook + realtime subscription
- `src/pages/Achievements.tsx` — wire hook
- `src/pages/ParentDashboard.tsx` — wire hook

## Result

- Finishing a scene → XP saves → event fires → Dashboard/Achievements re-render instantly with new level/XP/trophies
- Earning a trophy mid-story → toast still fires + dashboard reflects it without navigating away and back
- Cross-tab/cross-device → storage event + Supabase realtime keep all open views in sync
