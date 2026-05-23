## Pre-production bug audit

I re-read the recently changed files (`Mission.tsx`, `databaseStory.ts`, `ComprehensionQuiz.tsx`, `StoryGallery.tsx`) plus adjacent flows (Dashboard, Subscription, SharedStory, ReferralWidget). Below is what's clean, what's risky, and what I recommend changing before shipping.

### Verified clean (no action needed)
- **Finish flow guards**: `isFinishedRef` is set before `clearCurrentStoryInDatabase`, and every post-finish DB write (`onChoose` autosave, `goBack`, inventory use, quiz `onComplete`, Save & Exit) short-circuits on `isFinishedRef.current`.
- **`saveStoryToDatabase`**: refuses to downgrade a `completed` row back to `active` (re-reads the row first).
- **`pauseStoryInDatabase`**: `.neq('status','completed')` is in place, so a completed row can never be paused.
- **ComprehensionQuiz**: `onOpenChange` only reacts to explicit close; `onInteractOutside` and `onEscapeKeyDown` are prevented. Tapping Next won't dismiss the dialog.
- **Share Story button** removed from `Mission.tsx` and `StoryGallery.tsx`. ReferralWidget's "Share Referral Link" is the unrelated referral feature — leave it.

### Recommended fixes (small, scoped)

1. **Dead `/shared/:storyId` route + `SharedStory` lazy import (`src/App.tsx`)**
   Share Story is removed but the route and lazy chunk are still bundled. Remove the import and the `<Route path="/shared/:storyId" …>` line. Optionally delete `src/pages/SharedStory.tsx` to drop the dead code.

2. **`quizTaken` / `quizScore` are never persisted (`src/lib/databaseStory.ts`)**
   In `Mission.tsx` line 1780-1786 we set `updatedStory.quizTaken = true` and `quizScore = xpEarned`, then call `saveStoryToDatabase`. But `saveStoryToDatabase` only writes a fixed `storyData` object that doesn't include either field. On reload, the "Do Challenge for Bonus Points" button reappears and a user can re-take the quiz for repeat XP. Fix: persist these into the existing `profile` jsonb (or a `quiz_taken`/`quiz_score` column if available) and read them back in `loadStoryByIdFromDatabase`. Simplest in-scope fix: stash `quizTaken`/`quizScore` inside `story.profile` before save, and re-hydrate from `data.profile` on load.

3. **StoryGallery self-heal is too eager (`src/pages/StoryGallery.tsx` lines 44-64)**
   It marks any story where `current_scene_index + 1 >= scene_count` as completed. That includes "Adventure Complete — ready to finish" stories the user hasn't actually finished (no XP awarded yet, inventory not cleared, no completed-story save). If a user opens the gallery before clicking Finish Adventure, their unfinished run is silently auto-completed and they lose the chance to take the quiz/collect XP. Fix: only self-heal rows that have `completed_at` set; drop the scene-count heuristic (the Finish button is the only legitimate completion path).

4. **`RequireSubscription` re-fetches on every navigation (`src/App.tsx` lines 87-118)**
   `useEffect` depends on `location.pathname`, so each in-app navigation triggers a new `getUserSubscription` call and a full `NativeLoadingScreen` flash. Fix: only re-check when `user?.id` changes, or cache the result for the session and re-validate in the background.

5. **Story-ID-changed alerts kept as `console.error` for production (`src/pages/Mission.tsx` lines 335, 516, 621, 759, 919)**
   These are useful but noisy in production. Either leave them (acceptable) or downgrade to `console.warn`. Non-blocking.

### Out of scope (do not touch this pass)
- Subscription/IAP flows, edge functions, RLS policies — no regressions observed in the changed files.
- Onboarding, paywall, Settings, ParentDashboard — unchanged by recent edits.

### Files to edit
- `src/App.tsx` — remove `SharedStory` import + route; tighten `RequireSubscription` effect deps.
- `src/lib/databaseStory.ts` — round-trip `quizTaken`/`quizScore` via `profile`.
- `src/pages/Mission.tsx` — write `quizTaken`/`quizScore` into `profile` before `saveStoryToDatabase` in the quiz `onComplete`.
- `src/pages/StoryGallery.tsx` — remove the scene-count branch from the self-heal filter.
- (optional) delete `src/pages/SharedStory.tsx`.

No database migrations. After approval and implementation, publish to push to web and the next iOS build.
