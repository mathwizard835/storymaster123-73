# Fix: stories crashing mid-way and restarting as a new story

## What parents see
A child is several scenes into a story, the app suddenly reloads, and a brand-new story starts instead of the old one continuing.

## Plan
1. **Bring the child back to their story after a crash.** When the app reopens, look for an unfinished story from the last 24 hours (active or paused) and continue it. Only start a fresh story when the child taps "New Story".
2. **Stop the app from running out of memory.** Clear old narration audio when the child picks a choice, leaves the page, or plays a new scene, so memory doesn't pile up.
3. **No more "story corrupted, start over" jumps.** If the app gets confused about which story is open, it fixes itself quietly and stays on the same story.
4. **Lighter text animation.** Update the story text as it appears a few times per second instead of dozens, so older iPhones and iPads don't get overloaded.
5. **Check it.** Play a 6+ scene story with Read-to-Me on, force a reload in the middle, and confirm the same story comes back at the same scene. Story content and quality stay the same.

## Do we need to pay for anything?
No. The crash happens because the child's iPhone or iPad runs out of short-term memory while the app is open. Your cloud storage and your Supabase plan have nothing to do with it, so there's nothing to buy.

## Safeguards so the fix doesn't break anything else
- **Finished stories stay finished:** the resume step skips stories marked complete.
- **"New Story" still works:** tapping it starts a fresh story as it does today.
- **No duplicate stories:** before starting a new story, the app checks whether one is already being created and reuses it.
- **Narration still plays:** audio is cleared only when it's no longer needed (the child picks a choice, leaves the page, or a new scene starts). Saved narration on the device stays.
- **Older resumes still work:** if a saved story is missing scenes, the app falls back to the newest saved scene instead of failing.
- **Tests before release:** quick tests for the resume rule (active/paused, under 24h, not completed), plus a run in the browser: a 6+ scene story with Read-to-Me, then a forced reload mid-story, then tapping New Story, then finishing a story and confirming it doesn't come back.
- **Recovery tracking:** a small note goes in the logs each time a story is resumed after a crash, so we can see how often it happens.

## Rollout
- Website: live as soon as you publish.
- iPhone app: users only get it after a new App Store version (npx cap sync ios, then Xcode, then App Store Connect).

## Technical details
- `databaseStory.ts`: `loadCurrentStoryFromDatabase` uses `.in('status',['active','paused'])`, `updated_at` within 24h, newest first, and skips `completed`.
- `Mission.tsx`: run `clearAllActiveStoriesForUser()` and auto-generate only when `new=true`; replace the `navigate('/profile?new=true')` corruption branches with a resync of `currentStoryId`; add audio cleanup (pause, `URL.revokeObjectURL`) on choice, on unmount and before new playback; throttle `onNarrativeDelta` to about 80ms.
- No changes to the edge function, prompts or database schema.
